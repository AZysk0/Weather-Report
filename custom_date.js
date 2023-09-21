// ========= creating custom type (class) (Immutable please !!!)
export function CustomDate(year = new Date().getFullYear(), month = new Date().getMonth() + 1, day = new Date().getDate()) {
    Object.defineProperties(this, {
        year: { value: String(year), writable: false, enumerable: true, },
        month: { value: month >= 10 ? String(month) : "0" + String(month), writable: false, enumerable: true, },
        day: { value: String(day), writable: false, enumerable: true, },
    });
    
    Object.freeze(this); // Make the object immutable
};

CustomDate.prototype.asString = function() {
    const res = function() {
        const xs = [this.year, "-", this.month, "-", this.day];
        return xs.reduce((prev, next) => prev + next);  // monoid :D
    }.bind(this); 
    return res();
};

CustomDate.prototype.AddDays = function(nDays) {
    // Convert the current year, month, and day to numbers
    const year = parseInt(this.year);
    const month = parseInt(this.month);
    const day = parseInt(this.day);

    // Create a new date by adding/subtracting the specified number of days
    const newDate = new Date(year, month - 1, day + nDays);

    // Return a new CustomDate object with the updated date components
    return new CustomDate(newDate.getFullYear(), newDate.getMonth() + 1, newDate.getDate());
}

// ===========
export function CustomTime(hours, minutes, seconds) {
    this.hours = hours % 24;
    this.minutes = minutes;
    this.seconds = seconds;
}

CustomTime.prototype.asString = function() {
    const res = function() {
        return this.hours + ":" + this.minutes
    }.bind(this); 
    return res();
}

export const timeDifferenceMinutes = (t1, t2) => {
    const minutes1 = t1.hours * 60 + t1.minutes;
    const minutes2 = t2.hours * 60 + t2.minutes;
    return Math.abs(minutes2 - minutes1);
}

export const formatDateISO8601 = (date, time) => { // (str, str) -> str
    // if (time.split(":").filter((x) => Boolean(x)).length == 0) {
    //     return date + "T" + "00:00:00";
    // } else if (time.split(":").filter((x) => Boolean(x)).length == 1) {
    //     return date + "T" + time + ":00:00"
    // } else if (time.split(":").filter((x) => Boolean(x)).length == 2) {
    //     const t = time + ":00"
    // };
    return date + "T" + time + ":00";
}

export const timeToMinutes = (time) => {
    const nTokens = time.split(":").filter((x) => Boolean(x)).length;
    if (nTokens == 1) {
        return parseInt(time.split(":")[0]) * 60;
    } else if (nTokens >= 2) {
        const [hours, minutes] = time.split(":").slice(0, 2).map((x) => parseInt(x));
        return hours * 60 + minutes;
    } else {
        return 0;
    }
}
