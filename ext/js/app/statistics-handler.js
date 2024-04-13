// this class handles all of the setting, updating and wiping of statistics.

export class StatisticsHandler {
    prepare() {
        
        this.initLastUpdate();
        this.initNumSelects();
        this.checkIfUpdateRequired();
    }

    // creates numSelects entry in chrome local storage if doesnt already exist
    // e.g: if user's first time setting up
    initNumSelects() {
        chrome.storage.local.get('numSelects', function(data) {
            if (typeof data.numSelects === 'undefined') {
                chrome.storage.local.set({ numSelects: 0 })
            } 
        });
    }
    // creates lastUpdate entry if doesnt already exist
    initLastUpdate() {
        chrome.storage.local.get(["lastUpdate"]).then((result) => {
            if (typeof result.lastUpdate === 'undefined') {
                // only trigger update at end of today.
                const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
                chrome.storage.local.set({ lastUpdate: todayEnd.toJSON() });
            } 
        }); 
    }

    // update num selects if today is a new day.
    checkIfUpdateRequired() {
        chrome.storage.local.get(["lastUpdate"]).then((result) => {
            var storedJSONDate = result.lastUpdate;
            var lastUpdate = new Date(storedJSONDate);
            if (new Date() > lastUpdate) { // new day found. reset all statistics.
                chrome.storage.local.set({ numSelects: 0 })
                const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
                chrome.storage.local.set({ lastUpdate: todayEnd.toJSON() })
            }
        }); 
    }

    // increment num selects by 1
    async incrementNumSelects() {
        chrome.storage.local.get(["numSelects"]).then((result) => {
            chrome.storage.local.set({ numSelects: result.numSelects + 1 });
        });
    }



}