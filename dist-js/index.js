export { BaseDirectory } from '@tauri-apps/api/path';
import { Resource, invoke, Channel } from '@tauri-apps/api/core';

// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT
/**
 * Access the file system.
 *
 * ## Security
 *
 * This module prevents path traversal, not allowing absolute paths or parent dir components
 * (i.e. "/usr/path/to/file" or "../path/to/file" paths are not allowed).
 * Paths accessed with this API must be relative to one of the {@link BaseDirectory | base directories}
 * so if you need access to arbitrary filesystem paths, you must write such logic on the core layer instead.
 *
 * The API has a scope configuration that forces you to restrict the paths that can be accessed using glob patterns.
 *
 * The scope configuration is an array of glob patterns describing folder paths that are allowed.
 * For instance, this scope configuration only allows accessing files on the
 * *databases* folder of the {@link https://v2.tauri.app/reference/javascript/api/namespacepath/#appdatadir | `$APPDATA` directory}:
 * ```json
 * {
 *   "plugins": {
 *     "fs": {
 *       "scope": ["$APPDATA/databases/*"]
 *     }
 *   }
 * }
 * ```
 *
 * Notice the use of the `$APPDATA` variable. The value is injected at runtime, resolving to the {@link https://v2.tauri.app/reference/javascript/api/namespacepath/#appdatadir | app data directory}.
 *
 * The available variables are:
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#appconfigdir | $APPCONFIG},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#appdatadir | $APPDATA},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#appLocaldatadir | $APPLOCALDATA},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#appcachedir | $APPCACHE},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#applogdir | $APPLOG},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#audiodir | $AUDIO},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#cachedir | $CACHE},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#configdir | $CONFIG},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#datadir | $DATA},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#localdatadir | $LOCALDATA},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#desktopdir | $DESKTOP},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#documentdir | $DOCUMENT},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#downloaddir | $DOWNLOAD},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#executabledir | $EXE},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#fontdir | $FONT},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#homedir | $HOME},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#picturedir | $PICTURE},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#publicdir | $PUBLIC},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#runtimedir | $RUNTIME},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#templatedir | $TEMPLATE},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#videodir | $VIDEO},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#resourcedir | $RESOURCE},
 * {@linkcode https://v2.tauri.app/reference/javascript/api/namespacepath/#tempdir | $TEMP}.
 *
 * Trying to execute any API with a URL not configured on the scope results in a promise rejection due to denied access.
 *
 * Note that this scope applies to **all** APIs on this module.
 *
 * @module
 */
var SeekMode;
(function (SeekMode) {
    SeekMode[SeekMode["Start"] = 0] = "Start";
    SeekMode[SeekMode["Current"] = 1] = "Current";
    SeekMode[SeekMode["End"] = 2] = "End";
})(SeekMode || (SeekMode = {}));
function parseFileInfo(r) {
    return {
        isFile: r.isFile,
        isDirectory: r.isDirectory,
        isSymlink: r.isSymlink,
        size: r.size,
        mtime: r.mtime !== null ? new Date(r.mtime) : null,
        atime: r.atime !== null ? new Date(r.atime) : null,
        birthtime: r.birthtime !== null ? new Date(r.birthtime) : null,
        readonly: r.readonly,
        fileAttributes: r.fileAttributes,
        dev: r.dev,
        ino: r.ino,
        mode: r.mode,
        nlink: r.nlink,
        uid: r.uid,
        gid: r.gid,
        rdev: r.rdev,
        blksize: r.blksize,
        blocks: r.blocks,
    };
}
/**
 *  The Tauri abstraction for reading and writing files.
 *
 * @since 2.0.0
 */
class FileHandle extends Resource {
    /**
     * Reads up to `p.byteLength` bytes into `p`. It resolves to the number of
     * bytes read (`0` < `n` <= `p.byteLength`) and rejects if any error
     * encountered. Even if `read()` resolves to `n` < `p.byteLength`, it may
     * use all of `p` as scratch space during the call. If some data is
     * available but not `p.byteLength` bytes, `read()` conventionally resolves
     * to what is available instead of waiting for more.
     *
     * When `read()` encounters end-of-file condition, it resolves to EOF
     * (`null`).
     *
     * When `read()` encounters an error, it rejects with an error.
     *
     * Callers should always process the `n` > `0` bytes returned before
     * considering the EOF (`null`). Doing so correctly handles I/O errors that
     * happen after reading some bytes and also both of the allowed EOF
     * behaviors.
     *
     * @example
     * ```typescript
     * import { open, read, close, BaseDirectory } from "@tauri-apps/plugin-fs"
     * // if "$APP/foo/bar.txt" contains the text "hello world":
     * const file = await open("foo/bar.txt", { baseDir: BaseDirectory.App });
     * const buf = new Uint8Array(100);
     * const numberOfBytesRead = await file.read(buf); // 11 bytes
     * const text = new TextDecoder().decode(buf);  // "hello world"
     * await close(file.rid);
     * ```
     *
     * @since 2.0.0
     */
    async read(buffer) {
        if (buffer.byteLength === 0) {
            return 0;
        }
        const [data, nread] = await invoke("plugin:fs|read", {
            rid: this.rid,
            len: buffer.byteLength,
        });
        buffer.set(data);
        return nread === 0 ? null : nread;
    }
    /**
     * Seek sets the offset for the next `read()` or `write()` to offset,
     * interpreted according to `whence`: `Start` means relative to the
     * start of the file, `Current` means relative to the current offset,
     * and `End` means relative to the end. Seek resolves to the new offset
     * relative to the start of the file.
     *
     * Seeking to an offset before the start of the file is an error. Seeking to
     * any positive offset is legal, but the behavior of subsequent I/O
     * operations on the underlying object is implementation-dependent.
     * It returns the number of cursor position.
     *
     * @example
     * ```typescript
     * import { open, seek, write, SeekMode, BaseDirectory } from '@tauri-apps/plugin-fs';
     *
     * // Given hello.txt pointing to file with "Hello world", which is 11 bytes long:
     * const file = await open('hello.txt', { read: true, write: true, truncate: true, create: true, baseDir: BaseDirectory.App });
     * await file.write(new TextEncoder().encode("Hello world"), { baseDir: BaseDirectory.App });
     *
     * // Seek 6 bytes from the start of the file
     * console.log(await file.seek(6, SeekMode.Start)); // "6"
     * // Seek 2 more bytes from the current position
     * console.log(await file.seek(2, SeekMode.Current)); // "8"
     * // Seek backwards 2 bytes from the end of the file
     * console.log(await file.seek(-2, SeekMode.End)); // "9" (e.g. 11-2)
     * ```
     *
     * @since 2.0.0
     */
    async seek(offset, whence) {
        return await invoke("plugin:fs|seek", {
            rid: this.rid,
            offset,
            whence,
        });
    }
    /**
     * Returns a {@linkcode FileInfo } for this file.
     *
     * @example
     * ```typescript
     * import { open, fstat, BaseDirectory } from '@tauri-apps/plugin-fs';
     * const file = await open("file.txt", { read: true, baseDir: BaseDirectory.App });
     * const fileInfo = await fstat(file.rid);
     * console.log(fileInfo.isFile); // true
     * ```
     *
     * @since 2.0.0
     */
    async stat() {
        const res = await invoke("plugin:fs|fstat", {
            rid: this.rid,
        });
        return parseFileInfo(res);
    }
    /**
     * Truncates or extends this file, to reach the specified `len`.
     * If `len` is not specified then the entire file contents are truncated.
     *
     * @example
     * ```typescript
     * import { ftruncate, open, write, read, BaseDirectory } from '@tauri-apps/plugin-fs';
     *
     * // truncate the entire file
     * const file = await open("my_file.txt", { read: true, write: true, create: true, baseDir: BaseDirectory.App });
     * await ftruncate(file.rid);
     *
     * // truncate part of the file
     * const file = await open("my_file.txt", { read: true, write: true, create: true, baseDir: BaseDirectory.App });
     * await write(file.rid, new TextEncoder().encode("Hello World"));
     * await ftruncate(file.rid, 7);
     * const data = new Uint8Array(32);
     * await read(file.rid, data);
     * console.log(new TextDecoder().decode(data)); // Hello W
     * ```
     *
     * @since 2.0.0
     */
    async truncate(len) {
        await invoke("plugin:fs|ftruncate", {
            rid: this.rid,
            len,
        });
    }
    /**
     * Writes `p.byteLength` bytes from `p` to the underlying data stream. It
     * resolves to the number of bytes written from `p` (`0` <= `n` <=
     * `p.byteLength`) or reject with the error encountered that caused the
     * write to stop early. `write()` must reject with a non-null error if
     * would resolve to `n` < `p.byteLength`. `write()` must not modify the
     * slice data, even temporarily.
     *
     * @example
     * ```typescript
     * import { open, write, close, BaseDirectory } from '@tauri-apps/plugin-fs';
     * const encoder = new TextEncoder();
     * const data = encoder.encode("Hello world");
     * const file = await open("bar.txt", { write: true, baseDir: BaseDirectory.App });
     * const bytesWritten = await write(file.rid, data); // 11
     * await close(file.rid);
     * ```
     *
     * @since 2.0.0
     */
    async write(data) {
        return await invoke("plugin:fs|write", {
            rid: this.rid,
            data: Array.from(data),
        });
    }
}
/**
 * Creates a file if none exists or truncates an existing file and resolves to
 *  an instance of {@linkcode FileHandle }.
 *
 * @example
 * ```typescript
 * import { create, BaseDirectory } from "@tauri-apps/plugin-fs"
 * const file = await create("foo/bar.txt", { baseDir: BaseDirectory.App });
 * ```
 *
 * @since 2.0.0
 */
async function create(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    const rid = await invoke("plugin:fs|create", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
    return new FileHandle(rid);
}
/**
 * Open a file and resolve to an instance of {@linkcode FileHandle}. The
 * file does not need to previously exist if using the `create` or `createNew`
 * open options. It is the callers responsibility to close the file when finished
 * with it.
 *
 * @example
 * ```typescript
 * import { open, BaseDirectory } from "@tauri-apps/plugin-fs"
 * const file = await open("foo/bar.txt", { read: true, write: true, baseDir: BaseDirectory.App });
 * // Do work with file
 * await close(file.rid);
 * ```
 *
 * @since 2.0.0
 */
async function open(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    const rid = await invoke("plugin:fs|open", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
    return new FileHandle(rid);
}
/**
 * Copies the contents and permissions of one file to another specified path, by default creating a new file if needed, else overwriting.
 * @example
 * ```typescript
 * import { copyFile, BaseDirectory } from '@tauri-apps/plugin-fs';
 * await copyFile('app.conf', 'app.conf.bk', { fromPathBaseDir: BaseDirectory.App, toPathBaseDir: BaseDirectory.App });
 * ```
 *
 * @since 2.0.0
 */
async function copyFile(fromPath, toPath, options) {
    if ((fromPath instanceof URL && fromPath.protocol !== "file:") ||
        (toPath instanceof URL && toPath.protocol !== "file:")) {
        throw new TypeError("Must be a file URL.");
    }
    await invoke("plugin:fs|copy_file", {
        fromPath: fromPath instanceof URL ? fromPath.toString() : fromPath,
        toPath: toPath instanceof URL ? toPath.toString() : toPath,
        options,
    });
}
/**
 * Creates a new directory with the specified path.
 * @example
 * ```typescript
 * import { mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
 * await mkdir('users', { baseDir: BaseDirectory.App });
 * ```
 *
 * @since 2.0.0
 */
async function mkdir(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    await invoke("plugin:fs|mkdir", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
}
/**
 * Reads the directory given by path and returns an array of `DirEntry`.
 * @example
 * ```typescript
 * import { readDir, BaseDirectory } from '@tauri-apps/plugin-fs';
 * import { join } from '@tauri-apps/api/path';
 * const dir = "users"
 * const entries = await readDir('users', { baseDir: BaseDirectory.App });
 * processEntriesRecursive(dir, entries);
 * async function processEntriesRecursive(parent, entries) {
 *   for (const entry of entries) {
 *     console.log(`Entry: ${entry.name}`);
 *     if (entry.isDirectory) {
 *        const dir = await join(parent, entry.name);
 *       processEntriesRecursive(dir, await readDir(dir, { baseDir: BaseDirectory.App }))
 *     }
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 */
async function readDir(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return await invoke("plugin:fs|read_dir", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
}
/**
 * Reads and resolves to the entire contents of a file as an array of bytes.
 * TextDecoder can be used to transform the bytes to string if required.
 * @example
 * ```typescript
 * import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';
 * const contents = await readFile('avatar.png', { baseDir: BaseDirectory.Resource });
 * ```
 *
 * @since 2.0.0
 */
async function readFile(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    const arr = await invoke("plugin:fs|read_file", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
    return arr instanceof ArrayBuffer
        ? new Uint8Array(arr)
        : Uint8Array.from(arr);
}
/**
 * Reads and returns the entire contents of a file as UTF-8 string.
 * @example
 * ```typescript
 * import { readTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
 * const contents = await readTextFile('app.conf', { baseDir: BaseDirectory.App });
 * ```
 *
 * @since 2.0.0
 */
async function readTextFile(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return await invoke("plugin:fs|read_text_file", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
}
/**
 * Returns an async {@linkcode AsyncIterableIterator} over the lines of a file as UTF-8 string.
 * @example
 * ```typescript
 * import { readTextFileLines, BaseDirectory } from '@tauri-apps/plugin-fs';
 * const lines = await readTextFileLines('app.conf', { baseDir: BaseDirectory.App });
 * for await (const line of lines) {
 *   console.log(line);
 * }
 * ```
 * You could also call {@linkcode AsyncIterableIterator.next} to advance the
 * iterator so you can lazily read the next line whenever you want.
 *
 * @since 2.0.0
 */
async function readTextFileLines(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    const pathStr = path instanceof URL ? path.toString() : path;
    return await Promise.resolve({
        path: pathStr,
        rid: null,
        async next() {
            if (this.rid === null) {
                this.rid = await invoke("plugin:fs|read_text_file_lines", {
                    path: pathStr,
                    options,
                });
            }
            const [line, done] = await invoke("plugin:fs|read_text_file_lines_next", { rid: this.rid });
            // an iteration is over, reset rid for next iteration
            if (done)
                this.rid = null;
            return {
                value: done ? "" : line,
                done,
            };
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    });
}
/**
 * Removes the named file or directory.
 * If the directory is not empty and the `recursive` option isn't set to true, the promise will be rejected.
 * @example
 * ```typescript
 * import { remove, BaseDirectory } from '@tauri-apps/plugin-fs';
 * await remove('users/file.txt', { baseDir: BaseDirectory.App });
 * await remove('users', { baseDir: BaseDirectory.App });
 * ```
 *
 * @since 2.0.0
 */
async function remove(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    await invoke("plugin:fs|remove", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
}
/**
 * Renames (moves) oldpath to newpath. Paths may be files or directories.
 * If newpath already exists and is not a directory, rename() replaces it.
 * OS-specific restrictions may apply when oldpath and newpath are in different directories.
 *
 * On Unix, this operation does not follow symlinks at either path.
 *
 * @example
 * ```typescript
 * import { rename, BaseDirectory } from '@tauri-apps/plugin-fs';
 * await rename('avatar.png', 'deleted.png', { oldPathBaseDir: BaseDirectory.App, newPathBaseDir: BaseDirectory.App });
 * ```
 *
 * @since 2.0.0
 */
async function rename(oldPath, newPath, options) {
    if ((oldPath instanceof URL && oldPath.protocol !== "file:") ||
        (newPath instanceof URL && newPath.protocol !== "file:")) {
        throw new TypeError("Must be a file URL.");
    }
    await invoke("plugin:fs|rename", {
        oldPath: oldPath instanceof URL ? oldPath.toString() : oldPath,
        newPath: newPath instanceof URL ? newPath.toString() : newPath,
        options,
    });
}
/**
 * Resolves to a {@linkcode FileInfo} for the specified `path`. Will always
 * follow symlinks but will reject if the symlink points to a path outside of the scope.
 *
 * @example
 * ```typescript
 * import { stat, BaseDirectory } from '@tauri-apps/plugin-fs';
 * const fileInfo = await stat("hello.txt", { baseDir: BaseDirectory.App });
 * console.log(fileInfo.isFile); // true
 * ```
 *
 * @since 2.0.0
 */
async function stat(path, options) {
    const res = await invoke("plugin:fs|stat", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
    return parseFileInfo(res);
}
/**
 * Resolves to a {@linkcode FileInfo} for the specified `path`. If `path` is a
 * symlink, information for the symlink will be returned instead of what it
 * points to.
 *
 * @example
 * ```typescript
 * import { lstat, BaseDirectory } from '@tauri-apps/plugin-fs';
 * const fileInfo = await lstat("hello.txt", { baseDir: BaseDirectory.App });
 * console.log(fileInfo.isFile); // true
 * ```
 *
 * @since 2.0.0
 */
async function lstat(path, options) {
    const res = await invoke("plugin:fs|lstat", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
    return parseFileInfo(res);
}
/**
 * Truncates or extends the specified file, to reach the specified `len`.
 * If `len` is `0` or not specified, then the entire file contents are truncated.
 *
 * @example
 * ```typescript
 * import { truncate, readFile, writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
 * // truncate the entire file
 * await truncate("my_file.txt", 0, { baseDir: BaseDirectory.App });
 *
 * // truncate part of the file
 * let file = "file.txt";
 * await writeFile(file, new TextEncoder().encode("Hello World"), { baseDir: BaseDirectory.App });
 * await truncate(file, 7);
 * const data = await readFile(file, { baseDir: BaseDirectory.App });
 * console.log(new TextDecoder().decode(data));  // "Hello W"
 * ```
 *
 * @since 2.0.0
 */
async function truncate(path, len, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    await invoke("plugin:fs|truncate", {
        path: path instanceof URL ? path.toString() : path,
        len,
        options,
    });
}
/**
 * Write `data` to the given `path`, by default creating a new file if needed, else overwriting.
 * @example
 * ```typescript
 * import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
 *
 * let encoder = new TextEncoder();
 * let data = encoder.encode("Hello World");
 * await writeFile('file.txt', data, { baseDir: BaseDirectory.App });
 * ```
 *
 * @since 2.0.0
 */
async function writeFile(path, data, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    await invoke("plugin:fs|write_file", data, {
        headers: {
            path: path instanceof URL ? path.toString() : path,
            options: JSON.stringify(options),
        },
    });
}
/**
  * Writes UTF-8 string `data` to the given `path`, by default creating a new file if needed, else overwriting.
    @example
  * ```typescript
  * import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
  *
  * await writeTextFile('file.txt', "Hello world", { baseDir: BaseDirectory.App });
  * ```
  *
  * @since 2.0.0
  */
async function writeTextFile(path, data, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    await invoke("plugin:fs|write_text_file", {
        path: path instanceof URL ? path.toString() : path,
        data,
        options,
    });
}
/**
 * Check if a path exists.
 * @example
 * ```typescript
 * import { exists, BaseDirectory } from '@tauri-apps/plugin-fs';
 * // Check if the `$APPDATA/avatar.png` file exists
 * await exists('avatar.png', { baseDir: BaseDirectory.AppData });
 * ```
 *
 * @since 2.0.0
 */
async function exists(path, options) {
    if (path instanceof URL && path.protocol !== "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return await invoke("plugin:fs|exists", {
        path: path instanceof URL ? path.toString() : path,
        options,
    });
}
async function unwatch(rid) {
    await invoke("plugin:fs|unwatch", { rid });
}
/**
 * Watch changes (after a delay) on files or directories.
 *
 * @since 2.0.0
 */
async function watch(paths, cb, options) {
    const opts = {
        recursive: false,
        delayMs: 2000,
        ...options,
    };
    const watchPaths = Array.isArray(paths) ? paths : [paths];
    for (const path of watchPaths) {
        if (path instanceof URL && path.protocol !== "file:") {
            throw new TypeError("Must be a file URL.");
        }
    }
    const onEvent = new Channel();
    onEvent.onmessage = cb;
    const rid = await invoke("plugin:fs|watch", {
        paths: watchPaths.map((p) => (p instanceof URL ? p.toString() : p)),
        options: opts,
        onEvent,
    });
    return () => {
        void unwatch(rid);
    };
}
/**
 * Watch changes on files or directories.
 *
 * @since 2.0.0
 */
async function watchImmediate(paths, cb, options) {
    const opts = {
        recursive: false,
        ...options,
        delayMs: null,
    };
    const watchPaths = Array.isArray(paths) ? paths : [paths];
    for (const path of watchPaths) {
        if (path instanceof URL && path.protocol !== "file:") {
            throw new TypeError("Must be a file URL.");
        }
    }
    const onEvent = new Channel();
    onEvent.onmessage = cb;
    const rid = await invoke("plugin:fs|watch", {
        paths: watchPaths.map((p) => (p instanceof URL ? p.toString() : p)),
        options: opts,
        onEvent,
    });
    return () => {
        void unwatch(rid);
    };
}

export { FileHandle, SeekMode, copyFile, create, exists, lstat, mkdir, open, readDir, readFile, readTextFile, readTextFileLines, remove, rename, stat, truncate, watch, watchImmediate, writeFile, writeTextFile };
