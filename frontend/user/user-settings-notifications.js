//User notifications frontend


const realtime = document.getElementById("notification-radio-realtime")
const onceDay = document.getElementById("notification-radio-once-day")
const noThanks = document.getElementById("notification-radio-no-thanks")
const yes = document.getElementById("notification-radio-yes")
const no = document.getElementById("notification-radio-no")


document.addEventListener('DOMContentLoaded', () => {
    loadNotificationsSettings();
    setupNotificationsEventListeners();
});

function setupNotificationsEventListeners(){
    document.querySelectorAll('input[name="saved-listings"]').forEach(radio => {
        radio.addEventListener('change', saveNotificationSettings);
    });
    
    document.querySelectorAll('input[name="marketing_emails"]').forEach(radio => {
        radio.addEventListener('change', saveNotificationSettings);
    });
}

// Load user notifications settings from backend
async function loadNotificationsSettings() {
    try {
        const response = await fetch(`${API_BASE}/notifications`, {
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`Error loading notifications settings! status: ${response.status}`);
        }

        const data = await response.json();
        const notifications = data.notification_settings;

        // console.log("Loaded notification settings:", notifications);

        populateNotificationsSettings(notifications);
    } catch (error) {
        console.error("Failed to load notification settings:", error);
    }
}

function populateNotificationsSettings(notifications) {
    // For saved_listings group
    if (notifications.saved_listings === 'realtime') {
        realtime.checked = true;
    } else if (notifications.saved_listings === 'once_a_day') {
        onceDay.checked = true;
    } else if (notifications.saved_listings === 'no_thanks') {
        noThanks.checked = true;
    }

    // For marketing_emails group
    if (notifications.marketing_emails === 'yes') {
        yes.checked = true;
    } else {
        no.checked = true;
    }
}

async function saveNotificationSettings() {
    try {

        // Get values directly from checked radios
        const savedListings = document.querySelector('input[name="saved-listings"]:checked')?.value;
        const marketingEmails = document.querySelector('input[name="marketing_emails"]:checked')?.value;
         
        console.log("Saving notification settings:", savedListings, marketingEmails);

        const response = await fetch(`${API_BASE}/notifications`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-csrf-token": window.getCsrfToken(),
            },
            credentials: "include",
            body: JSON.stringify({
                savedListings,
                marketingEmails
            }),
        });

        if(!response.ok){
            throw new Error("Error updating notification settings")
        }

    } catch (error) {
        console.error("Error saving notification settings:", error);
    }
}