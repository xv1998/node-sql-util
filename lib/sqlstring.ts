// copy form https://github.com/mysqljs/sqlstring
let SqlString = exports;

let ID_GLOBAL_REGEXP = /`/g;
let QUAL_GLOBAL_REGEXP = /\./g;
let CHARS_GLOBAL_REGEXP = /[\0\b\t\n\r\x1a\"\'\\]/g; // eslint-disable-line no-control-regex
let CHARS_ESCAPE_MAP: {[index:string]:string} = {
  "\0": "\\0",
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\r": "\\r",
  "\x1a": "\\Z",
  '"': '\\"',
  "'": "\\'",
  "\\": "\\\\"
};

SqlString.escapeId = function escapeId(val:any, forbidQualified:any) {
  if (Array.isArray(val)) {
    let sql = "";

    for (let i = 0; i < val.length; i++) {
      sql += (i === 0 ? "" : ", ") + SqlString.escapeId(val[i], forbidQualified);
    }

    return sql;
  } else if (forbidQualified) {
    return "`" + String(val).replace(ID_GLOBAL_REGEXP, "``") + "`";
  } else {
    return (
      "`" +
      String(val)
        .replace(ID_GLOBAL_REGEXP, "``")
        .replace(QUAL_GLOBAL_REGEXP, "`.`") +
      "`"
    );
  }
};

SqlString.escape = function escape(val:any, stringifyObjects:any, timeZone:any) {
  if (typeof val === "undefined" || val === null) {
    return "NULL";
  }

  switch (typeof val) {
    case "boolean":
      return val ? "true" : "false";
    case "number":
      return String(val);
    case "object":
      if (val instanceof Date) {
        return SqlString.dateToString(val, timeZone || "local");
      } else if (Array.isArray(val)) {
        return SqlString.arrayToList(val, timeZone);
      } else if (Buffer.isBuffer(val)) {
        return SqlString.bufferToString(val);
      } else if (typeof val.toSqlString === "function") {
        return String(val.toSqlString());
      } else if (stringifyObjects) {
        return escapeString(val.toString());
      } else {
        return SqlString.objectToValues(val, timeZone);
      }
    default:
      return escapeString(val);
  }
};

SqlString.arrayToList = function arrayToList(array:any, timeZone:any) {
  let sql = "";

  for (let i = 0; i < array.length; i++) {
    let val = array[i];

    if (Array.isArray(val)) {
      sql += (i === 0 ? "" : ", ") + "(" + SqlString.arrayToList(val, timeZone) + ")";
    } else {
      sql += (i === 0 ? "" : ", ") + SqlString.escape(val, true, timeZone);
    }
  }

  return sql;
};

SqlString.format = function format(sql:any, _values:any, stringifyObjects:any, timeZone:any) {
  let values = _values;
  if (values == null) {
    return sql;
  }

  if (!(values instanceof Array || Array.isArray(values))) {
    values = [values];
  }

  let chunkIndex = 0;
  let placeholdersRegex = /\?+/g;
  let result = "";
  let valuesIndex = 0;
  let match;

  while (valuesIndex < values.length && (match = placeholdersRegex.exec(sql))) {
    let len = match[0].length;

    if (len > 2) {
      continue;
    }

    let value =
      len === 2
        ? SqlString.escapeId(values[valuesIndex])
        : SqlString.escape(values[valuesIndex], stringifyObjects, timeZone);

    result += sql.slice(chunkIndex, match.index) + value;
    chunkIndex = placeholdersRegex.lastIndex;
    valuesIndex++;
  }

  if (chunkIndex === 0) {
    // Nothing was replaced
    return sql;
  }

  if (chunkIndex < sql.length) {
    return result + sql.slice(chunkIndex);
  }

  return result;
};

SqlString.dateToString = function dateToString(date:any, timeZone:any) {
  let dt = new Date(date);

  if (isNaN(dt.getTime())) {
    return "NULL";
  }

  let year;
  let month;
  let day;
  let hour;
  let minute;
  let second;
  let millisecond;

  if (timeZone === "local") {
    year = dt.getFullYear();
    month = dt.getMonth() + 1;
    day = dt.getDate();
    hour = dt.getHours();
    minute = dt.getMinutes();
    second = dt.getSeconds();
    millisecond = dt.getMilliseconds();
  } else {
    let tz = convertTimezone(timeZone);

    if (tz !== false && tz !== 0) {
      dt.setTime(dt.getTime() + tz * 60000);
    }

    year = dt.getUTCFullYear();
    month = dt.getUTCMonth() + 1;
    day = dt.getUTCDate();
    hour = dt.getUTCHours();
    minute = dt.getUTCMinutes();
    second = dt.getUTCSeconds();
    millisecond = dt.getUTCMilliseconds();
  }

  // YYYY-MM-DD HH:mm:ss.mmm
  let str =
    zeroPad(year, 4) +
    "-" +
    zeroPad(month, 2) +
    "-" +
    zeroPad(day, 2) +
    " " +
    zeroPad(hour, 2) +
    ":" +
    zeroPad(minute, 2) +
    ":" +
    zeroPad(second, 2) +
    "." +
    zeroPad(millisecond, 3);

  return escapeString(str);
};

SqlString.bufferToString = function bufferToString(buffer:any) {
  return "X" + escapeString(buffer.toString("hex"));
};

SqlString.objectToValues = function objectToValues(object:any, timeZone:any) {
  let sql = "";

  for (let key in object) {
    if (object.hasOwnProperty(key)) {
      let val = object[key];

      if (typeof val === "function") {
        continue;
      }

      sql += (sql.length === 0 ? "" : ", ") + SqlString.escapeId(key) + " = " + SqlString.escape(val, true, timeZone);
    }
  }

  return sql;
};

SqlString.raw = function raw(sql:string) {
  if (typeof sql !== "string") {
    throw new TypeError("argument sql must be a string");
  }

  return {
    toSqlString: function toSqlString() {
      return sql;
    }
  };
};

function escapeString(val:any) {
  let chunkIndex = (CHARS_GLOBAL_REGEXP.lastIndex = 0);
  let escapedVal = "";
  let match;

  while ((match = CHARS_GLOBAL_REGEXP.exec(val))) {
    escapedVal += val.slice(chunkIndex, match.index) + CHARS_ESCAPE_MAP[match[0]];
    chunkIndex = CHARS_GLOBAL_REGEXP.lastIndex;
  }

  if (chunkIndex === 0) {
    // Nothing was escaped
    return "'" + val + "'";
  }

  if (chunkIndex < val.length) {
    return "'" + escapedVal + val.slice(chunkIndex) + "'";
  }

  return "'" + escapedVal + "'";
}

function zeroPad(_number:number, length:number) {
  let number = _number.toString();
  while (number.length < length) {
    number = "0" + number;
  }

  return number;
}

function convertTimezone(tz:string) {
  if (tz === "Z") {
    return 0;
  }

  let m = tz.match(/([\+\-\s])(\d\d):?(\d\d)?/);
  if (m) {
    return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60) * 60;
  }
  return false;
}
