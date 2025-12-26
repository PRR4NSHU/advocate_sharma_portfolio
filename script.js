// --- CONFIGURATION ---
const ADVOCATE_PHONE = "917535933300"; 
const UPI_ID = "advocatealg.associate@okhdfcbank";
// Ensure API URL has /api at the end
const API_URL = "https://advocate-sharma-portfolio.onrender.com/api"; 

let currentBooking = {};

// --- THEME TOGGLE LOGIC ---
function toggleTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');
    
    if (html.getAttribute('data-theme') === 'dark') {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        icon.className = 'fas fa-moon';
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        icon.className = 'fas fa-sun';
    }
}

// Initialize Theme from LocalStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('themeIcon');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
    }
});

// --- NAVIGATION LOGIC ---
function showScene(sceneId) {
    // Hide all overlays and main sections
    ['main-page', 'payment-page', 'success-page', 'status-page', 'admin-page', 'login-modal', 'recovery-modal'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    // Show requested scene
    document.getElementById(sceneId).classList.remove('hidden');
    window.scrollTo(0,0);
}

// SCROLL NAVIGATION (For Home/About/Contact)
function navigateTo(sectionId) {
    // Ensure we are on the main page view
    showScene('main-page');
    
    // Scroll to the section
    setTimeout(() => {
        const element = document.getElementById(sectionId);
        if(element) element.scrollIntoView({behavior: 'smooth'});
    }, 100);
}

// --- MODAL CONTROLS ---
function showLoginModal() {
    document.getElementById('recovery-modal').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
}

function showRecoveryModal() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('recovery-modal').classList.remove('hidden');
}

function closeModals() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('recovery-modal').classList.add('hidden');
}

// --- 1. CLIENT BOOKING ---
function goToPaymentPage(e) {
    e.preventDefault();
    const select = document.getElementById('cService');
    currentBooking = {
        name: document.getElementById('cName').value,
        phone: document.getElementById('cPhone').value,
        service: select.options[select.selectedIndex].text,
        fee: select.value,
        date: document.getElementById('cDate').value
    };
    document.getElementById('payName').innerText = currentBooking.name;
    document.getElementById('payAmount').innerText = "₹ " + currentBooking.fee;
    
    // Generate QR
    const upiUrl = `upi://pay?pa=${UPI_ID}&pn=Advocate&am=${currentBooking.fee}&cu=INR`;
    document.getElementById('dynamicQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;
    showScene('payment-page');
}

// --- NEW SPECIFIC APP FUNCTION ---
function payViaApp(appName) {
    const amount = currentBooking.fee;
    const name  = encodeURIComponent('Advocate Sharma');
    
    // Base Params
    const params = `pa=${UPI_ID}&pn=${name}&am=${amount}&cu=INR`;
    
    let url = "";

    if(appName === 'phonepe') {
            // Try PhonePe Scheme (Works on many Android devices)
            url = `phonepe://pay?${params}`;
    } else if (appName === 'paytm') {
            // Try Paytm Scheme
            url = `paytmmp://pay?${params}`;
    } else {
            // Fallback to standard UPI
            url = `upi://pay?${params}`;
    }

    // Redirect
    window.location.href = url;
}

// --- STANDARD UPI FUNCTION ---
function payWithUPI() {
    const amount = currentBooking.fee;
    const name  = encodeURIComponent('Advocate Sharma'); 
    const url = `upi://pay?pa=${UPI_ID}&pn=${name}&am=${amount}&cu=INR`;
    window.location.href = url;   
}

// 👇👇👇 UPDATED FUNCTION IS HERE 👇👇👇
async function confirmBooking() {
    // 1. Get Value and remove spaces
    const txnInput = document.getElementById('txnId');
    const txnId = txnInput.value.trim();

    // 2. CHECK: Agar khali hai to rok do
    if (!txnId) {
        alert("⚠️ Payment Verification Required!\n\nPlease enter the UPI Reference Number / UTR Number to confirm your booking.");
        txnInput.focus(); // Cursor wapas box me laye
        txnInput.style.borderColor = "red"; // Box ko red kar dein taaki dikhe
        return; // STOP EXECUTION HERE
    }

    // Reset style if valid
    txnInput.style.borderColor = "#cbd5e1";

    // 3. Proceed only if Txn ID exists
    const refId = "#" + Math.floor(100000 + Math.random() * 900000);
    const finalData = { ...currentBooking, refId, txnId };

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData)
        });

        if (response.ok) {
            document.getElementById('outRef').innerText = refId;
            showScene('success-page');
        } else {
            alert("Server Error: Could not save booking.");
        }
    } catch (error) {
        alert("Connection Error: Is the backend server running?");
    }
}
// 👆👆👆 UPDATED FUNCTION END 👆👆👆

// --- 2. CLIENT STATUS CHECK ---
async function checkStatus() {
    const refId = document.getElementById('searchRef').value.trim();
    const resultDiv = document.getElementById('statusResult');
    
    if(!refId) return alert("Please enter a Ref ID");

    try {
        const response = await fetch(`${API_URL}/status/${encodeURIComponent(refId)}`);
        if (response.ok) {
            const data = await response.json();
            let badgeClass = data.status === "Confirmed" ? "status-confirmed" : (data.status === "Rejected" ? "status-rejected" : "status-pending");
            
            resultDiv.innerHTML = `
                <p><strong>Client:</strong> ${data.name}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Service:</strong> ${data.service}</p>
                <p style="margin-top:10px;">Status: <span class="status-badge ${badgeClass}">${data.status}</span></p>
            `;
            resultDiv.classList.remove('hidden');
        } else {
            resultDiv.innerHTML = `<p style="color:var(--danger);">No booking found with Ref ID: ${refId}</p>`;
            resultDiv.classList.remove('hidden');
        }
    } catch (error) {
        alert("Error connecting to database.");
    }
}

// --- 3. ADMIN FUNCTIONS ---
async function loginAdmin() {
    const username = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPass').value;

    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            closeModals();
            loadAdminDashboard();
            showScene('admin-page');
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert("Server Connection Failed");
    }
}

async function performReset() {
    const data = {
        username: document.getElementById('recUser').value,
        email: document.getElementById('recEmail').value,
        securityAnswer: document.getElementById('recAns').value,
        newPassword: document.getElementById('newPass').value
    };

    try {
        const response = await fetch(`${API_URL}/admin/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        alert(result.message);
        if (result.success) {
            showLoginModal();
        }
    } catch (error) {
        alert("Server Error.");
    }
}

async function loadAdminDashboard() {
    try {
        const response = await fetch(`${API_URL}/bookings`);
        const bookings = await response.json();
        
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = "";

        if (bookings.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No Bookings Found</td></tr>";
            return;
        }

        bookings.forEach(b => {
            const row = `
                <tr>
                    <td><strong>${b.refId}</strong></td>
                    <td>${b.date}</td>
                    <td>${b.name}<br><small>${b.phone}</small></td>
                    <td>${b.service}<br><small>Txn: ${b.txnId}</small></td>
                    <td><span class="status-badge ${b.status === 'Confirmed' ? 'status-confirmed' : (b.status === 'Rejected' ? 'status-rejected' : 'status-pending')}">${b.status}</span></td>
                    <td>
                        <button onclick="updateStatus('${b._id}', 'Confirmed')" style="background:var(--success);" class="action-btn"><i class="fas fa-check"></i></button>
                        <button onclick="updateStatus('${b._id}', 'Rejected')" style="background:var(--danger);" class="action-btn"><i class="fas fa-times"></i></button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading dashboard", error);
    }
}

async function updateStatus(id, newStatus) {
    if(!confirm(`Mark this booking as ${newStatus}?`)) return;

    try {
        await fetch(`${API_URL}/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        loadAdminDashboard();
    } catch (error) {
        alert("Failed to update status");
    }
}

function logoutAdmin() {
    showScene('main-page');
}
