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

#define WASM_PAGE_SIZE 65536u
#define FNV1A_OFFSET 0x811c9dc5u
#define MIX_OFFSET 0x9e3779b9u

extern unsigned char __heap_base;

static uint32_t heap_ptr = 0u;

typedef struct {
    uint32_t expression_start;
    uint32_t expression_length;
    uint32_t reading_start;
    uint32_t reading_length;
    uint32_t definition_tags_start;
    uint32_t definition_tags_length;
    uint32_t rules_start;
    uint32_t rules_length;
    uint32_t score_start;
    uint32_t score_length;
    uint32_t glossary_start;
    uint32_t glossary_length;
    uint32_t sequence_start;
    uint32_t sequence_length;
    uint32_t term_tags_start;
    uint32_t term_tags_length;
} TermRowMeta;

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

static int is_ws(uint8_t c) {
    return c == ' ' || c == '\n' || c == '\r' || c == '\t';
}

static uint32_t skip_ws(const uint8_t* src, uint32_t len, uint32_t i) {
    while (i < len && is_ws(src[i])) { ++i; }
    return i;
}

static int parse_string_span(const uint8_t* src, uint32_t len, uint32_t start, uint32_t* out_end) {
    if (start >= len || src[start] != '"') { return 0; }
    uint32_t i = start + 1u;
    while (i < len) {
        uint8_t c = src[i];
        if (c == '\\') {
            i += 2u;
            continue;
        }
        if (c == '"') {
            *out_end = i + 1u;
            return 1;
        }
        ++i;
    }
    return 0;
}

static int parse_composite_span(const uint8_t* src, uint32_t len, uint32_t start, uint32_t* out_end) {
    if (start >= len) { return 0; }
    uint8_t open = src[start];
    uint8_t close = 0;
    if (open == '[') { close = ']'; }
    else if (open == '{') { close = '}'; }
    else { return 0; }

    uint32_t depth = 1u;
    uint32_t i = start + 1u;
    while (i < len) {
        uint8_t c = src[i];
        if (c == '"') {
            uint32_t s_end = 0;
            if (!parse_string_span(src, len, i, &s_end)) { return 0; }
            i = s_end;
            continue;
        }
        if (c == open) { ++depth; ++i; continue; }
        if (c == close) {
            --depth;
            ++i;
            if (depth == 0u) {
                *out_end = i;
                return 1;
            }
            continue;
        }
        ++i;
    }
    return 0;
}

static int parse_scalar_span(const uint8_t* src, uint32_t len, uint32_t start, uint32_t* out_end) {
    if (start >= len) { return 0; }
    uint32_t i = start;
    while (i < len) {
        uint8_t c = src[i];
        if (c == ',' || c == ']' || c == '}' || is_ws(c)) { break; }
        ++i;
    }
    if (i == start) { return 0; }
    *out_end = i;
    return 1;
}

static int parse_value_span(const uint8_t* src, uint32_t len, uint32_t start, uint32_t* out_end) {
    if (start >= len) { return 0; }
    uint8_t c = src[start];
    if (c == '"') { return parse_string_span(src, len, start, out_end); }
    if (c == '[' || c == '{') { return parse_composite_span(src, len, start, out_end); }
    return parse_scalar_span(src, len, start, out_end);
}

static void set_field(TermRowMeta* meta, uint32_t field_index, uint32_t start, uint32_t end) {
    uint32_t length = end > start ? (end - start) : 0u;
    switch (field_index) {
        case 0: meta->expression_start = start; meta->expression_length = length; break;
        case 1: meta->reading_start = start; meta->reading_length = length; break;
        case 2: meta->definition_tags_start = start; meta->definition_tags_length = length; break;
        case 3: meta->rules_start = start; meta->rules_length = length; break;
        case 4: meta->score_start = start; meta->score_length = length; break;
        case 5: meta->glossary_start = start; meta->glossary_length = length; break;
        case 6: meta->sequence_start = start; meta->sequence_length = length; break;
        case 7: meta->term_tags_start = start; meta->term_tags_length = length; break;
        default: break;
    }
}

static int parse_row(const uint8_t* src, uint32_t len, uint32_t row_start, uint32_t row_end, TermRowMeta* out_meta) {
    if (row_end <= row_start + 1u || src[row_start] != '[') { return 0; }
    out_meta->expression_start = 0u; out_meta->expression_length = 0u;
    out_meta->reading_start = 0u; out_meta->reading_length = 0u;
    out_meta->definition_tags_start = 0u; out_meta->definition_tags_length = 0u;
    out_meta->rules_start = 0u; out_meta->rules_length = 0u;
    out_meta->score_start = 0u; out_meta->score_length = 0u;
    out_meta->glossary_start = 0u; out_meta->glossary_length = 0u;
    out_meta->sequence_start = 0u; out_meta->sequence_length = 0u;
    out_meta->term_tags_start = 0u; out_meta->term_tags_length = 0u;

    uint32_t i = row_start + 1u;
    uint32_t field_index = 0u;
    while (i < row_end) {
        i = skip_ws(src, len, i);
        if (i >= row_end || src[i] == ']') { break; }
        uint32_t value_end = 0u;
        if (!parse_value_span(src, len, i, &value_end)) { return 0; }
        if (field_index < 8u) {
            set_field(out_meta, field_index, i, value_end);
        }
        ++field_index;
        i = skip_ws(src, len, value_end);
        if (i < row_end && src[i] == ',') {
            ++i;
        }
    }
    return out_meta->expression_length > 0u;
}

static int is_null_token(const uint8_t* src, uint32_t start, uint32_t length) {
    return length == 4u &&
        src[start] == 'n' &&
        src[start + 1u] == 'u' &&
        src[start + 2u] == 'l' &&
        src[start + 3u] == 'l';
}

static inline void hash_byte(uint32_t* h1, uint32_t* h2, uint8_t value) {
    *h1 = (uint32_t)(((*h1 ^ (uint32_t)value) * 0x01000193u) & 0xffffffffu);
    *h2 = (uint32_t)(((*h2 ^ (uint32_t)value) * 0x85ebca6bu) & 0xffffffffu);
    *h2 ^= (*h2 >> 13u);
}

static inline int write_byte_and_hash(
    uint8_t* out,
    uint32_t out_capacity,
    uint32_t* cursor,
    uint8_t value,
    uint32_t* h1,
    uint32_t* h2
) {
    if (*cursor >= out_capacity) { return 0; }
    out[*cursor] = value;
    *cursor += 1u;
    hash_byte(h1, h2, value);
    return 1;
}

static inline int write_bytes_and_hash(
    uint8_t* out,
    uint32_t out_capacity,
    uint32_t* cursor,
    const uint8_t* src,
    uint32_t length,
    uint32_t* h1,
    uint32_t* h2
) {
    for (uint32_t i = 0u; i < length; ++i) {
        if (!write_byte_and_hash(out, out_capacity, cursor, src[i], h1, h2)) {
            return 0;
        }
    }
    return 1;
}

static int token_equals_literal(
    const uint8_t* src,
    uint32_t start,
    uint32_t length,
    const uint8_t* literal,
    uint32_t literal_length
) {
    if (length != literal_length) { return 0; }
    for (uint32_t i = 0u; i < length; ++i) {
        if (src[start + i] != literal[i]) {
            return 0;
        }
    }
    return 1;
}

static int glossary_object_try_extract_text_value(
    const uint8_t* src,
    uint32_t src_len,
    uint32_t start,
    uint32_t end,
    uint32_t* out_text_start,
    uint32_t* out_text_length
) {
    static const uint8_t KEY_TYPE[] = "\"type\"";
    static const uint8_t KEY_TEXT[] = "\"text\"";
    static const uint8_t VALUE_TEXT[] = "\"text\"";

    if (start >= end || src[start] != '{') { return 0; }

    uint32_t i = skip_ws(src, src_len, start + 1u);
    int has_type_text = 0;
    int has_text_value = 0;
    uint32_t text_start = 0u;
    uint32_t text_length = 0u;

    while (i < end) {
        i = skip_ws(src, src_len, i);
        if (i >= end) { return 0; }
        if (src[i] == '}') { break; }

        uint32_t key_end = 0u;
        if (!parse_string_span(src, src_len, i, &key_end)) { return 0; }
        const uint32_t key_start = i;
        const uint32_t key_length = key_end - key_start;

        i = skip_ws(src, src_len, key_end);
        if (i >= end || src[i] != ':') { return 0; }
        i = skip_ws(src, src_len, i + 1u);

        uint32_t value_end = 0u;
        if (!parse_value_span(src, src_len, i, &value_end)) { return 0; }
        const uint32_t value_start = i;
        const uint32_t value_length = value_end - value_start;

        if (token_equals_literal(src, key_start, key_length, KEY_TYPE, sizeof(KEY_TYPE) - 1u)) {
            if (token_equals_literal(src, value_start, value_length, VALUE_TEXT, sizeof(VALUE_TEXT) - 1u)) {
                has_type_text = 1;
            }
        } else if (token_equals_literal(src, key_start, key_length, KEY_TEXT, sizeof(KEY_TEXT) - 1u)) {
            if (value_length > 0u && src[value_start] == '"') {
                has_text_value = 1;
                text_start = value_start;
                text_length = value_length;
            }
        }

        i = skip_ws(src, src_len, value_end);
        if (i < end && src[i] == ',') {
            i += 1u;
            continue;
        }
        if (i < end && src[i] == '}') {
            break;
        }
    }

    if (!(has_type_text && has_text_value)) {
        return 0;
    }

    *out_text_start = text_start;
    *out_text_length = text_length;
    return 1;
}

static int write_normalized_glossary_value_and_hash(
    const uint8_t* src,
    uint32_t src_len,
    uint32_t value_start,
    uint32_t value_end,
    uint8_t* out,
    uint32_t out_capacity,
    uint32_t* cursor,
    uint32_t* h1,
    uint32_t* h2
) {
    if (value_start >= value_end) { return 0; }
    const uint8_t c = src[value_start];
    if (c == '[') {
        if (!write_byte_and_hash(out, out_capacity, cursor, '[', h1, h2)) { return 0; }
        uint32_t i = value_start + 1u;
        int first = 1;
        while (i < value_end) {
            i = skip_ws(src, src_len, i);
            if (i >= value_end) { return 0; }
            if (src[i] == ']') { break; }

            uint32_t element_end = 0u;
            if (!parse_value_span(src, src_len, i, &element_end)) { return 0; }
            if (!first) {
                if (!write_byte_and_hash(out, out_capacity, cursor, ',', h1, h2)) { return 0; }
            }
            if (!write_normalized_glossary_value_and_hash(src, src_len, i, element_end, out, out_capacity, cursor, h1, h2)) {
                return 0;
            }
            first = 0;
            i = skip_ws(src, src_len, element_end);
            if (i < value_end && src[i] == ',') {
                i += 1u;
            }
        }
        if (!write_byte_and_hash(out, out_capacity, cursor, ']', h1, h2)) { return 0; }
        return 1;
    }

    if (c == '{') {
        uint32_t text_start = 0u;
        uint32_t text_length = 0u;
        if (glossary_object_try_extract_text_value(src, src_len, value_start, value_end, &text_start, &text_length)) {
            return write_bytes_and_hash(out, out_capacity, cursor, src + text_start, text_length, h1, h2);
        }
    }

    return write_bytes_and_hash(out, out_capacity, cursor, src + value_start, value_end - value_start, h1, h2);
}

static int encode_term_content_row(
    const uint8_t* src,
    const TermRowMeta* row,
    uint8_t* out,
    uint32_t out_capacity,
    uint32_t* cursor,
    uint32_t* out_h1,
    uint32_t* out_h2
) {
    static const uint8_t PREFIX_RULES[] = "{\"rules\":";
    static const uint8_t PREFIX_DEFINITION_TAGS[] = ",\"definitionTags\":";
    static const uint8_t PREFIX_TERM_TAGS[] = ",\"termTags\":";
    static const uint8_t PREFIX_GLOSSARY[] = ",\"glossary\":";
    static const uint8_t SUFFIX[] = "}";
    static const uint8_t EMPTY_QUOTED[] = "\"\"";

    uint32_t h1 = FNV1A_OFFSET;
    uint32_t h2 = MIX_OFFSET;

    if (!write_bytes_and_hash(out, out_capacity, cursor, PREFIX_RULES, sizeof(PREFIX_RULES) - 1u, &h1, &h2)) { return 0; }
    if (row->rules_length > 0u && !is_null_token(src, row->rules_start, row->rules_length)) {
        if (!write_bytes_and_hash(out, out_capacity, cursor, src + row->rules_start, row->rules_length, &h1, &h2)) { return 0; }
    } else {
        if (!write_bytes_and_hash(out, out_capacity, cursor, EMPTY_QUOTED, sizeof(EMPTY_QUOTED) - 1u, &h1, &h2)) { return 0; }
    }

    if (!write_bytes_and_hash(out, out_capacity, cursor, PREFIX_DEFINITION_TAGS, sizeof(PREFIX_DEFINITION_TAGS) - 1u, &h1, &h2)) { return 0; }
    if (row->definition_tags_length > 0u && !is_null_token(src, row->definition_tags_start, row->definition_tags_length)) {
        if (!write_bytes_and_hash(out, out_capacity, cursor, src + row->definition_tags_start, row->definition_tags_length, &h1, &h2)) { return 0; }
    } else {
        if (!write_bytes_and_hash(out, out_capacity, cursor, EMPTY_QUOTED, sizeof(EMPTY_QUOTED) - 1u, &h1, &h2)) { return 0; }
    }

    if (!write_bytes_and_hash(out, out_capacity, cursor, PREFIX_TERM_TAGS, sizeof(PREFIX_TERM_TAGS) - 1u, &h1, &h2)) { return 0; }
    if (row->term_tags_length > 0u && !is_null_token(src, row->term_tags_start, row->term_tags_length)) {
        if (!write_bytes_and_hash(out, out_capacity, cursor, src + row->term_tags_start, row->term_tags_length, &h1, &h2)) { return 0; }
    } else {
        if (!write_bytes_and_hash(out, out_capacity, cursor, EMPTY_QUOTED, sizeof(EMPTY_QUOTED) - 1u, &h1, &h2)) { return 0; }
    }

    if (!write_bytes_and_hash(out, out_capacity, cursor, PREFIX_GLOSSARY, sizeof(PREFIX_GLOSSARY) - 1u, &h1, &h2)) { return 0; }
    if (row->glossary_length > 0u) {
        if (!write_normalized_glossary_value_and_hash(
            src,
            row->glossary_start + row->glossary_length,
            row->glossary_start,
            row->glossary_start + row->glossary_length,
            out,
            out_capacity,
            cursor,
            &h1,
            &h2
        )) { return 0; }
    } else {
        static const uint8_t EMPTY_ARRAY[] = "[]";
        if (!write_bytes_and_hash(out, out_capacity, cursor, EMPTY_ARRAY, sizeof(EMPTY_ARRAY) - 1u, &h1, &h2)) { return 0; }
    }

    if (!write_bytes_and_hash(out, out_capacity, cursor, SUFFIX, sizeof(SUFFIX) - 1u, &h1, &h2)) { return 0; }

    if ((h1 | h2) == 0u) {
        h1 = 1u;
    }
    *out_h1 = h1;
    *out_h2 = h2;
    return 1;
}

__attribute__((visibility("default")))
int32_t parse_term_bank(uint32_t json_ptr, uint32_t json_len, uint32_t out_ptr, uint32_t out_capacity) {
    if (json_ptr == 0u || json_len == 0u || out_ptr == 0u || out_capacity == 0u) {
        return -1;
    }
    const uint8_t* src = (const uint8_t*)(uintptr_t)json_ptr;
    TermRowMeta* rows = (TermRowMeta*)(uintptr_t)out_ptr;

    uint32_t i = skip_ws(src, json_len, 0u);
    if (i >= json_len || src[i] != '[') { return -1; }
    ++i;

    uint32_t row_count = 0u;
    while (i < json_len) {
        i = skip_ws(src, json_len, i);
        if (i >= json_len) { break; }
        if (src[i] == ']') {
            return (int32_t)row_count;
        }
        uint32_t row_end = 0u;
        if (!parse_composite_span(src, json_len, i, &row_end)) {
            return -1;
        }
        if (row_count >= out_capacity) {
            return -2;
        }
        if (!parse_row(src, json_len, i, row_end, &rows[row_count])) {
            return -1;
        }
        ++row_count;
        i = skip_ws(src, json_len, row_end);
        if (i < json_len && src[i] == ',') {
            ++i;
        }
    }
    return -1;
}

__attribute__((visibility("default")))
int32_t encode_term_content(
    uint32_t json_ptr,
    uint32_t metas_ptr,
    uint32_t row_count,
    uint32_t out_ptr,
    uint32_t out_capacity,
    uint32_t row_meta_ptr
) {
    if (json_ptr == 0u || metas_ptr == 0u || out_ptr == 0u || row_meta_ptr == 0u) {
        return -1;
    }
    const uint8_t* src = (const uint8_t*)(uintptr_t)json_ptr;
    const TermRowMeta* rows = (const TermRowMeta*)(uintptr_t)metas_ptr;
    uint8_t* out = (uint8_t*)(uintptr_t)out_ptr;
    uint32_t* row_meta = (uint32_t*)(uintptr_t)row_meta_ptr;
    uint32_t cursor = 0u;

    for (uint32_t i = 0u; i < row_count; ++i) {
        const uint32_t start = cursor;
        uint32_t h1 = 0u;
        uint32_t h2 = 0u;
        if (!encode_term_content_row(src, &rows[i], out, out_capacity, &cursor, &h1, &h2)) {
            return -2;
        }
        const uint32_t o = i * 4u;
        row_meta[o + 0u] = start;
        row_meta[o + 1u] = cursor - start;
        row_meta[o + 2u] = h1;
        row_meta[o + 3u] = h2;
    }
    return (int32_t)cursor;
}
