document.addEventListener('DOMContentLoaded', async () => {
    const usersStatValue = document.getElementById('users-stat-value')
    const propertiesStatValue = document.getElementById('properties-stat-value')
    const inquiriesStatValue = document.getElementById('inquiries-stat-value')

    try {
        const response = await fetch('/admin/dashboard/stats', {
            credentials: "include"
        });
    
        if(!response.ok){
            throw new Error('Error displaying stats')
        }
    
        const data = await response.json()
    
        usersStatValue.textContent = data.total_users
        propertiesStatValue.textContent = data.total_properties
        inquiriesStatValue.textContent = data.new_inquiries
    }catch(error){
        console.error("Failed to load dashboard stats", error)
        showToast("Error loading stats", "error")
    }
})