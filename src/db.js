const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initializeDb() {
    const db = await open({
        filename: './roster.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            default_location_id INTEGER,
            team_id INTEGER,
            FOREIGN KEY(default_location_id) REFERENCES locations(id),
            FOREIGN KEY(team_id) REFERENCES teams(id),
            UNIQUE(name, phone)
        );
    `);

    const staffCount = await db.get('SELECT COUNT(*) as count FROM staff');
    if (staffCount.count === 0) {
        console.log('Seeding database from Data.txt logic...');
        
        // Initial core data
        const initialLocations = ['Airoli', 'BCP', 'Sify', 'Chandivali', 'Office', 'Remote'];
        for (const loc of initialLocations) {
            await db.run("INSERT OR IGNORE INTO locations (name) VALUES (?)", [loc]);
        }

        const initialShifts = ['General', 'General 2', 'Morning', 'Afternoon', 'Evening: 5:00 PM to 2:00 AM', 'Night'];
        for (const shift of initialShifts) {
            await db.run("INSERT OR IGNORE INTO shifts (name) VALUES (?)", [shift]);
        }

        const initialTeams = ['Server Monitoring', 'Operations', 'VMware Support'];
        for (const team of initialTeams) {
            await db.run("INSERT OR IGNORE INTO teams (name) VALUES (?)", [team]);
        }

        // Mapping helper (simplified version of the data in Data.txt)
        const staffData = [
            { name: 'Prasenjit', phone: '9477441161', location: 'Airoli', team: 'Server Monitoring' },
            { name: 'Pravin', phone: '9699205649', location: 'Airoli', team: 'Server Monitoring' },
            { name: 'Tanzila', phone: '9156777476', location: 'Airoli', team: 'Server Monitoring' },
            { name: 'Ethisham', phone: '9718617441', location: 'Airoli', team: 'Server Monitoring' },
            { name: 'Brian Rebello', phone: '9920778447', location: 'Airoli', team: 'Server Monitoring' },
            { name: 'Sambhav', phone: '9156230209', location: 'Airoli', team: 'Server Monitoring' },
            { name: 'Sukhada', phone: '8999759206', location: 'Airoli', team: 'Server Monitoring' },
            { name: 'Jayanth', phone: '9951401694', location: 'Airoli', team: 'Operations' },
            { name: 'Saurav', phone: '8651790951', location: 'BCP', team: 'Operations' },
            { name: 'Avinash', phone: '8920897522', location: 'BCP', team: 'Operations' },
            { name: 'Anand Reddy', phone: '9110749085', location: 'BCP', team: 'Operations' },
            { name: 'MD Faruk', phone: '9715811628', location: 'BCP', team: 'Operations' },
            { name: 'Sandeep', phone: '9936879015', location: 'Airoli', team: 'Operations' },
            { name: 'Pooja', phone: '9664350680', location: 'Airoli', team: 'Operations' },
            { name: 'Pradeep', phone: '9867885532', location: 'Airoli', team: 'Operations' },
            { name: 'Vishal Bhumkar', phone: '9987667452', location: 'Airoli', team: 'Operations' },
            { name: 'Prakash K', phone: '9688588975', location: 'BCP', team: 'Operations' },
            { name: 'Yuvraj', phone: '749811937', location: 'Airoli', team: 'Operations' },
            { name: 'Akash', phone: '8379031989', location: 'Airoli', team: 'Operations' },
            { name: 'Ashok Yadav', phone: '7039284529', location: 'Airoli', team: 'Operations' },
            { name: 'Samuel', phone: '8328414155', location: 'Airoli', team: 'Operations' },
            { name: 'Ankush', phone: '7720062966', location: 'Airoli', team: 'Operations' },
            { name: 'Umesh', phone: '88500 68580', location: 'Airoli', team: 'Operations' },
            { name: 'Shadab', phone: '70395 37340', location: 'Sify', team: 'Operations' },
            { name: 'Rakesh', phone: '8971348648', location: 'BCP', team: 'Operations' },
            { name: 'Jagdish', phone: '9021604070', location: 'Sify', team: 'Operations' },
            { name: 'Azhar', phone: '9740542032', location: 'BCP', team: 'Operations' },
            { name: 'Usha', phone: '9561841431', location: 'Airoli', team: 'Operations' },
            { name: 'Rishabh', phone: '8956061268', location: 'Chandivali', team: 'Operations' },
            { name: 'Manoj', phone: '8123548467', location: 'BCP', team: 'Operations' },
            { name: 'Sushil', phone: '81040 31920', location: 'Sify', team: 'Operations' },
            { name: 'Prasad', phone: '8454940364', location: 'Airoli', team: 'Operations' },
            { name: 'Sachin', phone: '8087004918', location: 'Airoli', team: 'Operations' },
            { name: 'Ganesh Dumbre', phone: '9096374607', location: 'Airoli', team: 'Operations' },
            { name: 'Ankita Rani', phone: '8210025984', location: 'BCP', team: 'Operations' },
            { name: 'Satish Mishra', phone: '7738908634', location: 'Airoli', team: 'VMware Support' },
            { name: 'Mangesh Pawar', phone: '7715814412', location: 'Airoli', team: 'VMware Support' }
        ];

        for (const s of staffData) {
            const team = await db.get("SELECT id FROM teams WHERE name = ?", [s.team]);
            const loc = await db.get("SELECT id FROM locations WHERE name = ?", [s.location]);
            await db.run(
                "INSERT OR IGNORE INTO staff (name, phone, default_location_id, team_id) VALUES (?, ?, ?, ?)",
                [s.name, s.phone, loc.id, team.id]
            );
        }
    }

    return db;
}

module.exports = { initializeDb };
