declare let SqlString: any;
declare let ID_GLOBAL_REGEXP: RegExp;
declare let QUAL_GLOBAL_REGEXP: RegExp;
declare let CHARS_GLOBAL_REGEXP: RegExp;
declare let CHARS_ESCAPE_MAP: {
    [index: string]: string;
};
declare function escapeString(val: any): string;
declare function zeroPad(_number: number, length: number): string;
declare function convertTimezone(tz: string): number | false;
