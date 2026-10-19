/*
 * Copyright (C) 2026 Yomitan authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

#include <stdint.h>

#define RECORD_HEADER_BYTES 20u
#define U32_NULL 0xffffffffu
#define U16_NULL 0xffffu
#define ENTRY_CONTENT_LENGTH_EXTENDED_U16 0xfffeu
#define WASM_PAGE_SIZE 65536u
#define ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM 0xffu
#define ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION 0x8000u
#define ENTRY_CONTENT_DICT_NAME_FLAGS_MASK 0x8000u

extern unsigned char __heap_base;

static uint32_t heap_ptr = 0u;

struct RecordMeta {
    uint32_t expression_off;
    uint32_t expression_len;
    uint32_t reading_off;
    uint32_t reading_len;
    int32_t entry_content_offset;
    int32_t entry_content_length;
    uint32_t dict_name_meta;
    uint32_t dict_name_off;
    int32_t score;
    int32_t sequence;
};

static uint32_t align8(uint32_t value) {
    return (value + 7u) & ~7u;
}

static int ensure_memory(uint32_t required_bytes) {
    uint32_t current_pages = __builtin_wasm_memory_size(0);
    uint32_t current_bytes = current_pages * WASM_PAGE_SIZE;
    if (required_bytes <= current_bytes) {
        return 1;
    }
    uint32_t missing = required_bytes - current_bytes;
    uint32_t grow_pages = (missing + (WASM_PAGE_SIZE - 1u)) / WASM_PAGE_SIZE;
    int32_t rc = __builtin_wasm_memory_grow(0, grow_pages);
    return rc >= 0;
}

__attribute__((visibility("default")))
void wasm_reset_heap(void) {
    heap_ptr = (uint32_t)(uintptr_t)&__heap_base;
}

__attribute__((visibility("default")))
uint32_t wasm_alloc(uint32_t size) {
    if (heap_ptr == 0u) {
        wasm_reset_heap();
    }
    uint32_t aligned_size = align8(size);
    uint32_t start = align8(heap_ptr);
    uint32_t end = start + aligned_size;
    if (!ensure_memory(end)) {
        return 0u;
    }
    heap_ptr = end;
    return start;
}

static inline void write_u16(uint8_t* out, uint32_t* cursor, uint32_t value) {
    uint32_t c = *cursor;
    out[c + 0u] = (uint8_t)(value & 0xffu);
    out[c + 1u] = (uint8_t)((value >> 8u) & 0xffu);
    *cursor = c + 2u;
}

static inline void write_u32(uint8_t* out, uint32_t* cursor, uint32_t value) {
    uint32_t c = *cursor;
    out[c + 0u] = (uint8_t)(value & 0xffu);
    out[c + 1u] = (uint8_t)((value >> 8u) & 0xffu);
    out[c + 2u] = (uint8_t)((value >> 16u) & 0xffu);
    out[c + 3u] = (uint8_t)((value >> 24u) & 0xffu);
    *cursor = c + 4u;
}

static inline void write_i32(uint8_t* out, uint32_t* cursor, int32_t value) {
    write_u32(out, cursor, (uint32_t)value);
}

static inline void copy_bytes(uint8_t* out, uint32_t* cursor, const uint8_t* src, uint32_t len) {
    uint32_t c = *cursor;
    for (uint32_t i = 0u; i < len; ++i) {
        out[c + i] = src[i];
    }
    *cursor = c + len;
}

__attribute__((visibility("default")))
uint32_t calc_encoded_size(uint32_t record_count, uint32_t metas_ptr) {
    const struct RecordMeta* metas = (const struct RecordMeta*)(uintptr_t)metas_ptr;
    uint32_t total = 0u;
    for (uint32_t i = 0u; i < record_count; ++i) {
        const struct RecordMeta* m = &metas[i];
        uint32_t variable =
            m->expression_len +
            ((m->dict_name_meta & ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION) != 0u ? 0u : m->reading_len);
        if ((m->dict_name_meta & 0xffu) == ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM) {
            variable += ((m->dict_name_meta & ~ENTRY_CONTENT_DICT_NAME_FLAGS_MASK) >> 8u);
        }
        total += RECORD_HEADER_BYTES + variable;
        if ((uint32_t)m->entry_content_length > 0xfffdu) {
            total += 4u;
        }
        if ((m->dict_name_meta & ~ENTRY_CONTENT_DICT_NAME_FLAGS_MASK) > 0x7fffu) {
            total += 4u;
        }
    }
    return total;
}

__attribute__((visibility("default")))
uint32_t encode_records(uint32_t record_count, uint32_t metas_ptr, uint32_t strings_ptr, uint32_t out_ptr) {
    const struct RecordMeta* metas = (const struct RecordMeta*)(uintptr_t)metas_ptr;
    const uint8_t* strings = (const uint8_t*)(uintptr_t)strings_ptr;
    uint8_t* out = (uint8_t*)(uintptr_t)out_ptr;
    uint32_t cursor = 0u;

    for (uint32_t i = 0u; i < record_count; ++i) {
        const struct RecordMeta* m = &metas[i];
        write_u16(out, &cursor, m->expression_len > U16_NULL ? U16_NULL : m->expression_len);
        write_u16(out, &cursor, m->reading_len > U16_NULL ? U16_NULL : m->reading_len);
        write_u32(out, &cursor, m->entry_content_offset >= 0 ? (uint32_t)m->entry_content_offset : U32_NULL);
        if (m->entry_content_length < 0) {
            write_u16(out, &cursor, U16_NULL);
        } else if ((uint32_t)m->entry_content_length <= 0xfffdu) {
            write_u16(out, &cursor, (uint32_t)m->entry_content_length);
        } else {
            write_u16(out, &cursor, ENTRY_CONTENT_LENGTH_EXTENDED_U16);
            write_u32(out, &cursor, (uint32_t)m->entry_content_length);
        }
        if ((m->dict_name_meta & ~ENTRY_CONTENT_DICT_NAME_FLAGS_MASK) <= 0x7fffu) {
            write_u16(out, &cursor, m->dict_name_meta);
        } else {
            write_u16(out, &cursor, U16_NULL);
            write_u32(out, &cursor, m->dict_name_meta);
        }
        write_i32(out, &cursor, m->score);
        write_i32(out, &cursor, m->sequence);

        copy_bytes(out, &cursor, strings + m->expression_off, m->expression_len);
        if ((m->dict_name_meta & ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION) == 0u) {
            copy_bytes(out, &cursor, strings + m->reading_off, m->reading_len);
        }
        if ((m->dict_name_meta & 0xffu) == ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM) {
            copy_bytes(out, &cursor, strings + m->dict_name_off, (m->dict_name_meta & ~ENTRY_CONTENT_DICT_NAME_FLAGS_MASK) >> 8u);
        }
    }
    return cursor;
}
