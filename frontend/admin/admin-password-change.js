document
	.getElementById("changePasswordForm")
	.addEventListener("submit", async (e) => {
		e.preventDefault();

		const oldPassword = document.getElementById("oldPassword").value.trim();
		const newPassword = document.getElementById("newPassword").value.trim();

		try {
			const res = await fetch(`/admin/change-password`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": window.getCsrfToken(),
				},
				credentials: "include",
				body: JSON.stringify({ oldPassword, newPassword }),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.message);

			redirectWithToast(data.message, "success", "/frontend/guest/index.html");
			document.getElementById("changePasswordForm").reset();
		} catch (err) {
			showToast("An error occured", "error");
		}
	});