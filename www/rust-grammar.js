export const conf = {
    comments: {
        lineComment: "//",
        blockComment: ["/*", "*/"],
    },
    brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
    ],
    autoClosingPairs: [
        { open: "[", close: "]" },
        { open: "{", close: "}" },
        { open: "(", close: ")" },
        { open: '"', close: '"', notIn: ["string"] },
    ],
    surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
    ],
    folding: {
        markers: {
            start: new RegExp("^\\s*#pragma\\s+region\\b"),
            end: new RegExp("^\\s*#pragma\\s+endregion\\b"),
        },
    },
};

export const grammar = {
    // Set defaultToken to invalid to see what you do not tokenize yet
    // defaultToken: 'invalid',

    keywords: [
        "as",
        "break",
        "const",
        "crate",
        "enum",
        "extern",
        "false",
        "fn",
        "impl",
        "in",
        "let",
        "mod",
        "move",
        "mut",
        "pub",
        "ref",
        "return",
        "self",
        "Self",
        "static",
        "struct",
        "super",
        "trait",
        "true",
        "type",
        "unsafe",
        "use",
        "where",
        "macro_rules",
        // Soroban-specific keywords
        "contract",
        "interface",
        "event",
        "storage",
        "env",
        "invoke",
        "deploy",
        "call",
        "emit",
        "require",
        "assert",
        "balance",
        "address",
        "transfer",
        "mint",
        "burn",
    ],

    controlFlowKeywords: [
        "continue",
        "else",
        "for",
        "if",
        "while",
        "loop",
        "match",
    ],

    typeKeywords: [
        "Self",
        "m32",
        "m64",
        "m128",
        "f80",
        "f16",
        "f128",
        "int",
        "uint",
        "float",
        "char",
        "bool",
        "u8",
        "u16",
        "u32",
        "u64",
        "f32",
        "f64",
        "i8",
        "i16",
        "i32",
        "i64",
        "str",
        "Option",
        "Either",
        "c_float",
        "c_double",
        "c_void",
        "FILE",
        "fpos_t",
        "DIR",
        "dirent",
        "c_char",
        "c_schar",
        "c_uchar",
        "c_short",
        "c_ushort",
        "c_int",
        "c_uint",
        "c_long",
        "c_ulong",
        "size_t",
        "ptrdiff_t",
        "clock_t",
        "time_t",
        "c_longlong",
        "c_ulonglong",
        "intptr_t",
        "uintptr_t",
        "off_t",
        "dev_t",
        "ino_t",
        "pid_t",
        "mode_t",
        "ssize_t",
        // Soroban-specific types
        "AccountId",
        "Amount",
        "Asset",
        "Timestamp",
        "Duration",
        "Hash",
        "Signature",
        "PublicKey",
        "PrivateKey",
    ],

    operators: [
        "=",
        ">",
        "<",
        "!",
        "~",
        "?",
        ":",
        "==",
        "<=",
        ">=",
        "!=",
        "&&",
        "||",
        "++",
        "--",
        "+",
        "-",
        "*",
        "/",
        "&",
        "|",
        "^",
        "%",
        "<<",
        ">>",
        ">>>",
        "+=",
        "-=",
        "*=",
        "/=",
        "&=",
        "|=",
        "^=",
        "%=",
        "<<=",
        ">>=",
        ">>>=",
    ],

    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*/^%]+/,

    // C# style strings
    escapes:
        /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    // The main tokenizer for our languages
    tokenizer: {
        root: [
            // identifiers and keywords
            [
                /[a-z_$][\w$]*/,
                {
                    cases: {
                        "@typeKeywords": "type.identifier",
                        "@keywords": {
                            cases: {
                                fn: { token: "keyword", next: "@func_decl" },
                                "@default": "keyword",
                            },
                        },
                        "@controlFlowKeywords": "keyword.control",
                        "@default": "variable",
                    },
                },
            ],
            [/[A-Z][\w$]*/, "type.identifier"], // to show class names nicely

            // whitespace
            { include: "@whitespace" },

            // delimiters and operators
            [/[{}()[\]]/, "@brackets"],
            [/[<>](?!@symbols)/, "@brackets"],
            [
                /@symbols/,
                { cases: { "@operators": "operator", "@default": "" } },
            ],

            // @ annotations.
            // As an example, we emit a debugging log message on these tokens.
            // Note: message are supressed during the first load -- change some lines to see them.
            [
                /@\s*[a-zA-Z_$][\w$]*/,
                { token: "annotation", log: "annotation token: $0" },
            ],

            // numbers
            [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
            [/0[xX][0-9a-fA-F]+/, "number.hex"],
            [/\d+/, "number"],

            // delimiter: after number because of .\d floats
            [/[;,.]/, "delimiter"],

            // strings
            [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
            [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

            // characters
            [/'[^\\']'/, "string"],
            [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
            [/'/, "string.invalid"],
        ],

        comment: [
            [/[^/*]+/, "comment"],
            [/\/\*/, "comment", "@push"], // nested comment
            ["\\*/", "comment", "@pop"],
            [/[/*]/, "comment"],
        ],

        string: [
            [/[^\\"]+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
        ],

        whitespace: [
            [/[ \t\r\n]+/, "white"],
            [/\/\*/, "comment", "@comment"],
            [/\/\/.*$/, "comment"],
        ],

        func_decl: [[/[a-z_$][\w$]*/, "support.function", "@pop"]],
        contract_decl: [[/[a-z_$][\w$]*/, "support.function", "@pop"]],
    },
};
