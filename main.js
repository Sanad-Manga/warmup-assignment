const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

   let startSeconds = secondsConverterHelper(startTime);
   let endSeconds = secondsConverterHelper(endTime);

    if (endSeconds < startSeconds) {
        endSeconds += 24 * 3600;
    }

   let result = endSeconds - startSeconds;

    return formatTime(result);

}

// converts the shift time taken in the clock format to seconds to perform calculations

function secondsConverterHelper(time){
    time = time.trim();

    let parts=time.split(" ");
    let clock = parts[0].split(":");

    let hours = Number(clock[0]);
    let minutes = Number(clock[1]);
    let seconds = Number(clock[2]);

    let period = parts[1]; // am or pm

    // handling am and pm test case by converting to 24 hr format (0-23)
    if (period === "pm" && hours !== 12) {
        hours += 12;
    }

    if (period === "am" && hours === 12) {
        hours -= 12;
    }

    let totalSeconds = hours * 3600 + minutes * 60 + seconds;

    return totalSeconds;
}

// takes the total seconds calculated and converts it back to the clock format

function formatTime(totalSeconds){

    let hours = Math.floor(totalSeconds / 3600);

    let remaining = totalSeconds % 3600;

    let minutes = Math.floor(remaining / 60);

    let seconds = remaining % 60;

    if (minutes < 10) {
        minutes = "0" + minutes;
    }

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    return hours + ":" + minutes + ":" + seconds;

}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    let startSeconds = secondsConverterHelper(startTime);
    let endSeconds = secondsConverterHelper(endTime);

    const delivStart = Number(28800); // 8:00:00 am
    const delivEnd = Number(79200); // 10:00:00 pm

    let idleTimeAfter = Number(0);
    let idleTimeBefore = Number(0);

    if (endSeconds < startSeconds){ // handles overnight edge case
        endSeconds += 86400
    }

    if (startSeconds < delivStart){
        idleTimeBefore =  delivStart - startSeconds ;
    }

    if (endSeconds > delivEnd){
        idleTimeAfter = endSeconds - delivEnd;
    }

    let idleTime = idleTimeAfter + idleTimeBefore

    return formatTime(idleTime);

}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    let result = secondsConverterHelper(shiftDuration) - secondsConverterHelper(idleTime);
    return formatTime(result);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    const dailyQuota = secondsConverterHelper("08:24:00");
    const eidQuota = secondsConverterHelper("06:00:00");
    const eidStart = new Date("2025-04-10");
    const eidEnd = new Date("2025-04-30");

    let activeSeconds = secondsConverterHelper(activeTime);
    let currentDate = new Date(date);

    if ( activeSeconds< dailyQuota && !( currentDate >= eidStart && currentDate <= eidEnd)){
        return false;
    }

    if (currentDate >= eidStart && currentDate <= eidEnd ){
        if(eidQuota > activeSeconds){
            return false;
        }
    }

    return true;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    let data = fs.readFileSync(textFile, "utf-8");
    let rows = data.split("\n");

    let lastDriver = -1;

    for (let i = 0; i < rows.length; i++) {

        if (rows[i].trim() === "") continue;

        let parts = rows[i].split(",");

        if (shiftObj.driverID === parts[0] && shiftObj.date === parts[2]) {
            return {};
        }

        if (shiftObj.driverID === parts[0]) {
            lastDriver = i;
        }
    }

    shiftObj.shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    shiftObj.idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    shiftObj.activeTime = getActiveTime(shiftObj.shiftDuration, shiftObj.idleTime);
    shiftObj.metQuota = metQuota(shiftObj.date, shiftObj.activeTime);
    shiftObj.hasBonus = false;

    let newRecord =
        shiftObj.driverID + "," +
        shiftObj.driverName + "," +
        shiftObj.date + "," +
        shiftObj.startTime + "," +
        shiftObj.endTime;

    if (lastDriver === -1) {

        fs.appendFileSync(textFile, "\n" + newRecord);

    } else {

        rows.splice(lastDriver + 1, 0, newRecord);

        let newData = rows.join("\n");

        fs.writeFileSync(textFile, newData);
    }

    return shiftObj;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let data = fs.readFileSync(textFile, "utf-8");
    let rows = data.split("\n");

    for ( let i = 0; rows.length > i; i++){

        if (rows[i].trim() === "") continue;

        let parts = rows[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {
           parts[9] = newValue;
           rows[i] = parts.join(",")
        }
    }

    let newData = rows.join("\n");

    fs.writeFileSync(textFile,newData);
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile, "utf-8");
    let rows = data.split("\n");

    let count = 0;

    let found = false;

    for ( let i = 0; rows.length > i; i++){

        if (rows[i].trim() === "") {
            continue;
        }

        let parts = rows[i].split(",");
        let dateParts = parts[2].split("-")
        let monthRow = Number(dateParts[1]);

        if (driverID  === parts[0] ) {
            found = true;

            if ((parts.length > 9 && parts[9].trim() === "true" && monthRow === Number(month))){
                count++;
            }
        }

    }
    if (!found){
        return -1;
    }

    return count;

}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile, "utf-8");
    let rows = data.split("\n");

    let totalSeconds = 0;

    for ( let i = 0; rows.length > i; i++){

        if (rows[i].trim() === "") {
            continue;
        }

        let parts = rows[i].split(",");
        let dateParts = parts[2].split("-")
        let monthRow = Number(dateParts[1]);

        // this uses the hint that it's supposed to be calculated not taken from the file ( the day off )
            if (driverID  === parts[0] && monthRow === Number(month)) {
                let shiftDuration = getShiftDuration(parts[3], parts[4]);
                let idleTime = getIdleTime(parts[3], parts[4]);
                let activeTime = getActiveTime(shiftDuration, idleTime);

                totalSeconds += secondsConverterHelper(activeTime);
            }
    }
    return formatTime(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    // -------- read rate file --------
    let rateData = fs.readFileSync(rateFile, "utf-8");
    let rateRows = rateData.split("\n");

    let dailyQuota = 0;
    let dayOff = "";

    for (let i = 0; i < rateRows.length; i++) {

        if (rateRows[i].trim() === "") continue;

        let parts = rateRows[i].split(",");

        if (parts[0].trim() === driverID) {
            dayOff = parts[1].trim();
            dailyQuota = Number(parts[3].trim());
            break;
        }
    }

    // -------- read shifts file --------
    let data = fs.readFileSync(textFile, "utf-8");
    let rows = data.split("\n");

    let totalSeconds = 0;

    for (let i = 0; i < rows.length; i++) {

        if (rows[i].trim() === "") continue;

        let parts = rows[i].split(",");

        if (parts[0].trim() !== driverID) continue;

        let dateParts = parts[2].trim().split("-");
        let year = Number(dateParts[0]);
        let monthRow = Number(dateParts[1]);
        let day = Number(dateParts[2]);

        if (monthRow !== Number(month)) continue;

        // check day off
        let weekday = new Date(parts[2].trim())
            .toLocaleDateString("en-US",{weekday:"long"});

        if (weekday === dayOff) continue;

        let quota = dailyQuota;

        // Eid rule
        if (year === 2025 && monthRow === 4 && day >= 10 && day <= 30) {
            quota = 6;
        }

        totalSeconds += quota * 3600;
    }

    // bonus reduction
    totalSeconds -= bonusCount * 2 * 3600;

    if (totalSeconds < 0) totalSeconds = 0;

    return formatTime(totalSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    let rateData = fs.readFileSync(rateFile, "utf-8");
    let rows = rateData.split("\n");

    let salary = 0;

    for (let i = 0; i < rows.length; i++) {

        if (rows[i].trim() === "") continue;

        let parts = rows[i].split(",");

        if (parts[0].trim() === driverID) {
            salary = Number(parts[2].trim());
            break;
        }
    }

    let actualSeconds = secondsConverterHelper(actualHours);
    let requiredSeconds = secondsConverterHelper(requiredHours);

    if (requiredSeconds === 0) return salary;

    let ratio = actualSeconds / requiredSeconds;

    if (ratio > 1) ratio = 1;

    let netPay = Math.floor(salary * ratio);

    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
