const logoutBtn = document.getElementById('adminLogoutBtn')

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const confirmed = await showConfirmation(
        "Are you sure you want to log out",
        "Confirm Logout",
        {
            confirmText: "Log out",
            cancelText: "Cancel",
            danger: true,
        }
    );

    if(!confirmed){
        return
    };

    try {
        const response = await fetch("/auth/logout",
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "x-csrf-token": window.getCsrfToken(),
                },
            }
        );

        if (!response.ok) throw new Error("Log out failed");

        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

        window.location.replace("/frontend/guest/index.html");

    } catch (error) {
        console.error("Logout failed:", error);
        showToast(data.message, "error");
    }
});