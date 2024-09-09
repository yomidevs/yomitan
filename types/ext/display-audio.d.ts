/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import type {TextToSpeechAudio} from '../../ext/js/media/text-to-speech-audio';
import type * as Audio from './audio';
import type * as AudioDownloader from './audio-downloader';
import type * as Settings from './settings';

export type CacheItem = {
    primaryCardAudio: null | PrimaryCardAudio;
    sourceMap: Map<number, CachedInfoList>;
};

export type CachedInfoList = {
    infoList: AudioInfoList | null;
    infoListPromise: Promise<AudioInfoList>;
};

export type AudioInfoList = AudioInfoListItem[];

export type AudioInfoListItem = {
    audio: GenericAudio | null;
    audioPromise: null | Promise<GenericAudio>;
    audioResolved: boolean;
    info: AudioDownloader.Info;
};

export type PrimaryCardAudio = {
    index: number;
    subIndex: null | number;
};

export type SourceInfo = {
    source: AudioSource | null;
    subIndex: null | number;
};

export type AudioSource = {
    downloadable: boolean;
    index: number;
    isInOptions: boolean;
    name: string;
    nameIndex: number;
    nameUnique: boolean;
    type: Settings.AudioSourceType;
    url: string;
    voice: string;
};

export type AudioSourceShort = {
    type: Settings.AudioSourceType;
    url: string;
    voice: string;
};

export type AudioMediaOptions = {
    preferredAudioIndex: null | number;
    sources: Audio.AudioSourceInfo[];
};

export type PlayAudioResult = {
    audio: GenericAudio | null;
    source: AudioSource | null;
    subIndex: number;
    valid: boolean;
};

export type TermAudio = {
    audio: GenericAudio;
    source: AudioSource;
    subIndex: number;
};

export type CreateAudioResult = {
    audio: GenericAudio | null;
    cacheUpdated: boolean;
    index: number;
};

export type GenericAudio = HTMLAudioElement | TextToSpeechAudio;

export type MenuItemEntry = {
    index: null | number;
    name: null | string;
    valid: boolean | null;
};
