document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost/vehicle-reservation/api.php';
    
    // DOM elements
    const userView = document.getElementById('user-view');
    const adminView = document.getElementById('admin-view');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const vehicleList = document.getElementById('vehicle-list');
    const vehicleSelect = document.getElementById('vehicle-select');
    const reservationsList = document.getElementById('reservations');
    const allReservationsList = document.getElementById('all-reservations-list');
    const reservationForm = document.getElementById('reservation-form');
    const vehicleStatus = document.getElementById('vehicle-status');
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    const addVehicleModal = document.getElementById('add-vehicle-modal');
    const closeModal = document.querySelector('.close');
    const addVehicleForm = document.getElementById('add-vehicle-form');
    const assignedDriverSelect = document.getElementById('assigned-driver');
    const driverSearchInput = document.getElementById('driver-search');
    
    // Edit Vehicle Modal Elements
    const editVehicleModal = document.getElementById('edit-vehicle-modal');
    const closeEditModal = document.querySelector('.close-edit');
    const editVehicleForm = document.getElementById('edit-vehicle-form');
    const editVehicleIdInput = document.getElementById('edit-vehicle-id');
    const editVehicleMakeInput = document.getElementById('edit-vehicle-make');
    const editVehicleModelInput = document.getElementById('edit-vehicle-model');
    const editVehiclePlateInput = document.getElementById('edit-vehicle-plate');

    // Driver Management Elements
    const addDriverBtn = document.getElementById('add-driver-btn');
    const addDriverModal = document.getElementById('add-driver-modal');
    const closeDriverModal = document.querySelector('.close-driver');
    const addDriverForm = document.getElementById('add-driver-form');
    const driversList = document.getElementById('drivers-list');
    const editDriverModal = document.getElementById('edit-driver-modal');
    const closeEditDriverModal = document.querySelector('.close-edit-driver');
    const editDriverForm = document.getElementById('edit-driver-form');
    const editDriverIdInput = document.getElementById('edit-driver-id');
    const editDriverNameInput = document.getElementById('edit-driver-name');

    // Global state
    let vehicles = [];
    let drivers = [];
    let reservations = [];

    // Initialize the app
    async function init() {
        await fetchData();
        setupEventListeners();
        document.getElementById('date').setAttribute('min', new Date().toISOString().split('T')[0]);
    }

    // Fetch all data from the API
    async function fetchData() {
        try {
            const [vehiclesRes, driversRes, reservationsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/vehicles`).then(res => res.json()),
                fetch(`${API_BASE_URL}/drivers`).then(res => res.json()),
                fetch(`${API_BASE_URL}/reservations`).then(res => res.json())
            ]);
            
            vehicles = vehiclesRes;
            drivers = driversRes;
            reservations = reservationsRes;
            
            renderAllViews();
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to load data. Please try again.');
        }
    }

    function renderAllViews() {
        renderVehicles();
        renderReservations();
        renderAllReservations();
        updateVehicleStatus();
        populateVehicleSelect();
        populateAssignedDriverSelect();
        renderPendingApprovals();
        renderDrivers();
    }

    function renderVehicles() {
        vehicleList.innerHTML = '';
        vehicles.forEach(vehicle => {
            const isAvailable = checkVehicleAvailability(vehicle.id);
            const vehicleElement = document.createElement('div');
            vehicleElement.className = `vehicle-item ${isAvailable ? '' : 'unavailable'}`;
            vehicleElement.innerHTML = `
                <h3>${vehicle.make} ${vehicle.model}</h3>
                <p>License: ${vehicle.plate}</p>
                <p>Status: ${isAvailable ? 'Available' : 'Unavailable'}</p>
            `;
            vehicleList.appendChild(vehicleElement);
        });
    }

    function renderDrivers(driversToRender = drivers) {
    driversList.innerHTML = '';
    
    if (driversToRender.length === 0) {
        driversList.innerHTML = '<p>No drivers found matching your search.</p>';
        return;
    }

    driversToRender.forEach(driver => {
        const driverElement = document.createElement('div');
        driverElement.className = 'driver-item';
        driverElement.innerHTML = `
            <h3>${driver.name}</h3>
            <p>ID: ${driver.id}</p>
            <div class="driver-actions">
                <button class="edit-driver-btn" data-id="${driver.id}">Edit</button>
                <button class="delete-driver-btn" data-id="${driver.id}">Delete</button>
            </div>
        `;
        driversList.appendChild(driverElement);
    });
}

function filterDrivers(searchTerm) {
    searchTerm = searchTerm.toLowerCase().trim();
    
    if (!searchTerm) {
        renderDrivers(); // Show all drivers if search is empty
        return;
    }
    
    const filteredDrivers = drivers.filter(driver => {
        return driver.name.toLowerCase().includes(searchTerm) || 
               driver.id.toString().includes(searchTerm);
    });
    
    renderDrivers(filteredDrivers);
}
    function formatLocalTime(timeString) {
        if (!timeString) return '';
        
        const now = new Date();
        const [hours, minutes] = timeString.split(':');
        const localTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        
        return localTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function getConfirmationStatusBadge(confirmationStatus) {
        const statusClass = `status-${confirmationStatus}`;
        const statusText = confirmationStatus.charAt(0).toUpperCase() + confirmationStatus.slice(1);
        return `<span class="confirmation-status ${statusClass}">${statusText}</span>`;
    }

    // ADD THE FILTER FUNCTION HERE - RIGHT AFTER OTHER UTILITY FUNCTIONS
    function filterReservationsByDate(reservations, filterType) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return reservations.filter(reservation => {
            const createdDate = new Date(reservation.created_at || reservation.date); // Fallback to date if created_at doesn't exist
            
            switch(filterType) {
                case 'today':
                    return createdDate >= today;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return createdDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return createdDate >= monthAgo;
                default:
                    return true;
            }
        });
    }

    function renderReservations(filterType = 'all') {
    reservationsList.innerHTML = '';
    
    // Filter out cancelled reservations from the main view
    let filteredReservations = reservations.filter(res => res.status !== 'cancelled');
    
    if (filterType !== 'all') {
        filteredReservations = filterReservationsByDate(filteredReservations, filterType);
    }
    
    if (filteredReservations.length === 0) {
        reservationsList.innerHTML = '<p>No active reservations found.</p>';
        return;
    }

    filteredReservations.forEach(reservation => {
        const vehicle = vehicles.find(v => v.id === reservation.vehicle_id);
        const driver = drivers.find(d => d.id === reservation.assigned_driver_id);
        const status = getReservationStatus(reservation);
        const reservationElement = document.createElement('div');
        
        reservationElement.className = `reservation-item ${reservation.confirmation_status}`;
        
        let actionButtons = '';
        let timeDisplay = formatLocalTime(reservation.start_time);
        
        if (reservation.confirmation_status === 'approved' && reservation.status !== 'cancelled' && reservation.status !== 'completed') {
            if (!reservation.end_time) {
                actionButtons = `
                    <div class="action-buttons">
                        <button class="return-btn" data-id="${reservation.id}">Return Vehicle</button>
                        <button class="cancel-btn" data-id="${reservation.id}">Cancel Reservation</button>
                    </div>
                `;
                
                if (status === "Active") {
                    timeDisplay = `${formatLocalTime(reservation.start_time)} - (In Use)`;
                } else {
                    timeDisplay = `${formatLocalTime(reservation.start_time)} - (Approved)`;
                }
            } else {
                timeDisplay = `${formatLocalTime(reservation.start_time)} - ${formatLocalTime(reservation.end_time)}`;
            }
        } else {
            timeDisplay = `${formatLocalTime(reservation.start_time)} - (${reservation.confirmation_status === 'pending' ? 'Pending Approval' : reservation.confirmation_status === 'rejected' ? 'Rejected' : 'Completed'})`;
        }

        let adminNotesDisplay = '';
        if (reservation.admin_notes && reservation.confirmation_status !== 'pending') {
            adminNotesDisplay = `
                <div class="admin-notes">
                    <strong>Admin Notes:</strong> ${reservation.admin_notes}
                </div>
            `;
        }
        
        reservationElement.innerHTML = `
            <h3>${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle'} ${getConfirmationStatusBadge(reservation.confirmation_status)}</h3>
            <p><strong>Reserved by:</strong> ${reservation.user_name}</p>
            <p><strong>Date:</strong> ${formatDate(reservation.date)}</p>
            <p><strong>Time:</strong> ${timeDisplay}</p>
            <p><strong>Purpose:</strong> ${reservation.purpose}</p>
            <p><strong>Assigned Driver:</strong> ${driver ? driver.name : 'N/A'}</p>
            <p><strong>Status:</strong> ${status}</p>
            ${adminNotesDisplay}
            ${actionButtons}
        `;
        reservationsList.appendChild(reservationElement);
    });
}

    function renderPendingApprovals() {
        let pendingSection = document.getElementById('pending-approvals');
        if (!pendingSection) {
            pendingSection = document.createElement('div');
            pendingSection.id = 'pending-approvals';
            pendingSection.className = 'pending-approvals';
            
            const adminView = document.getElementById('admin-view');
            const adminControls = adminView.querySelector('.admin-controls');
            adminView.insertBefore(pendingSection, adminControls.nextSibling);
        }

        const pendingReservations = reservations.filter(res => res.confirmation_status === 'pending');
        
        if (pendingReservations.length === 0) {
            pendingSection.innerHTML = `
                <h2>Pending Approvals</h2>
                <p>No reservations pending approval.</p>
            `;
            return;
        }

        let pendingHTML = '<h2>Pending Approvals</h2>';
        
        pendingReservations.forEach(reservation => {
            const vehicle = vehicles.find(v => v.id === reservation.vehicle_id);
            const driver = drivers.find(d => d.id === reservation.assigned_driver_id);
            
            pendingHTML += `
                <div class="reservation-item pending">
                    <h3>${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle'} ${getConfirmationStatusBadge('pending')}</h3>
                    <p><strong>Reserved by:</strong> ${reservation.user_name}</p>
                    <p><strong>Date:</strong> ${formatDate(reservation.date)}</p>
                    <p><strong>Time:</strong> ${formatLocalTime(reservation.start_time)}</p>
                    <p><strong>Purpose:</strong> ${reservation.purpose}</p>
                    <p><strong>Assigned Driver:</strong> ${driver ? driver.name : 'N/A'}</p>
                    <div class="action-buttons">
                        <button class="approve-btn" data-id="${reservation.id}">Approve</button>
                        <button class="reject-btn" data-id="${reservation.id}">Reject</button>
                    </div>
                </div>
            `;
        });
        
        pendingSection.innerHTML = pendingHTML;
    }

    function renderAllReservations(filterType = 'all') {
    allReservationsList.innerHTML = '';
    
    let filteredReservations = [...reservations];
    
    if (filterType !== 'all') {
        filteredReservations = filterReservationsByDate(filteredReservations, filterType);
    }
    
    if (filteredReservations.length === 0) {
        allReservationsList.innerHTML = '<p>No reservations found.</p>';
        return;
    }

    filteredReservations.forEach(reservation => {
        const vehicle = vehicles.find(v => v.id === reservation.vehicle_id);
        const driver = drivers.find(d => d.id === reservation.assigned_driver_id);
        const status = getReservationStatus(reservation);
        const reservationElement = document.createElement('div');
        reservationElement.className = `reservation-item ${reservation.confirmation_status}`;
        
        let timeDisplay = formatLocalTime(reservation.start_time);
        if (reservation.end_time) {
            timeDisplay = `${formatLocalTime(reservation.start_time)} - ${formatLocalTime(reservation.end_time)}`;
        } else {
            timeDisplay = `${formatLocalTime(reservation.start_time)} - ${status === "Active" ? "(In Use)" : "(Scheduled)"}`;
        }

        let adminNotesDisplay = '';
        if (reservation.admin_notes && reservation.confirmation_status !== 'pending') {
            adminNotesDisplay = `
                <div class="admin-notes">
                    <strong>Admin Notes:</strong> ${reservation.admin_notes}
                </div>
            `;
        }

        let cancellationReasonDisplay = '';
        if (reservation.cancellation_reason && reservation.status === 'cancelled') {
            cancellationReasonDisplay = `
                <div class="cancellation-reason">
                    <strong>Cancellation Reason:</strong> ${reservation.cancellation_reason}
                </div>
            `;
        }
        
        reservationElement.innerHTML = `
            <h3>${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle'} ${getConfirmationStatusBadge(reservation.confirmation_status)}</h3>
            <p><strong>Reserved by:</strong> ${reservation.user_name}</p>
            <p><strong>Date:</strong> ${formatDate(reservation.date)}</p>
            <p><strong>Time:</strong> ${timeDisplay}</p>
            <p><strong>Purpose:</strong> ${reservation.purpose}</p>
            <p><strong>Assigned Driver:</strong> ${driver ? driver.name : 'N/A'}</p>
            <p><strong>Status:</strong> ${status}</p>
            ${adminNotesDisplay}
            ${cancellationReasonDisplay}
            <button class="delete-reservation-btn" data-id="${reservation.id}">Delete Reservation</button>
        `;
        allReservationsList.appendChild(reservationElement);
    });
}

    function populateVehicleSelect() {
        vehicleSelect.innerHTML = '<option value="">-- Select a Vehicle --</option>';
        vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.id;
            option.textContent = `${vehicle.make} ${vehicle.model} (${vehicle.plate})`;
            vehicleSelect.appendChild(option);
        });
    }

    function populateAssignedDriverSelect() {
        if (!assignedDriverSelect) return;
        assignedDriverSelect.innerHTML = '<option value="">-- Select Assigned Driver --</option>';
        drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = driver.name;
            assignedDriverSelect.appendChild(option);
        });
    }

    function formatDate(dateString) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function checkVehicleAvailability(vehicleId) {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes for easier comparison

        // Check all reservations for this vehicle - exclude cancelled and rejected reservations
        const relevantReservations = reservations.filter(res => 
            res.vehicle_id === vehicleId &&
            res.status !== 'cancelled' &&           // Exclude cancelled reservations
            res.confirmation_status !== 'rejected'   // Exclude rejected reservations
        );

        // If no relevant reservations, vehicle is available
        if (relevantReservations.length === 0) return true;

        // Check each reservation to see if it makes the vehicle unavailable
        for (const res of relevantReservations) {
            const startTime = res.start_time.split(':');
            const startTimeInMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
            
            // For current date reservations
            if (res.date === currentDate) {
                // If reservation has an end time (completed)
                if (res.end_time) {
                    const endTime = res.end_time.split(':');
                    const endTimeInMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
                    
                    // If current time is within reservation window, vehicle is unavailable
                    if (currentTime >= startTimeInMinutes && currentTime <= endTimeInMinutes) {
                        return false;
                    }
                    // If current time is after reservation window, this reservation doesn't block availability
                    continue;
                }
                // If reservation has no end time and is approved
                else if (res.confirmation_status === 'approved') {
                    // If current time is past start time and no end time, it's active (unavailable)
                    if (currentTime >= startTimeInMinutes) {
                        return false;
                    }
                }
                // For pending reservations today that haven't started yet, they still block availability
                else if (res.confirmation_status === 'pending' && currentTime < startTimeInMinutes) {
                    return false;
                }
            }
            // For future date reservations (only if approved or pending)
            else if (res.date > currentDate) {
                if (res.confirmation_status === 'approved' || res.confirmation_status === 'pending') {
                    return false;
                }
            }
        }

        // If no reservations make it unavailable, it's available
        return true;
    }

    function updateVehicleStatus() {
        vehicleStatus.innerHTML = '';
        vehicles.forEach(vehicle => {
            const isAvailable = checkVehicleAvailability(vehicle.id);
            const statusElement = document.createElement('div');
            statusElement.className = `vehicle-status-item ${isAvailable ? 'available' : 'unavailable'}`;
            statusElement.innerHTML = `
                <h3>${vehicle.make} ${vehicle.model}</h3>
                <p>License: ${vehicle.plate}</p>
                <p><span class="status-indicator ${isAvailable ? 'status-available' : 'status-unavailable'}"></span>
                ${isAvailable ? 'Available' : 'Unavailable'}</p>
                <div class="vehicle-actions">
                    <button class="edit-vehicle-btn" data-id="${vehicle.id}">Edit</button>
                    <button class="delete-vehicle-btn" data-id="${vehicle.id}">Delete</button>
                </div>
            `;
            vehicleStatus.appendChild(statusElement);
        });
    }

    function getReservationStatus(reservation) {
        if (reservation.status === 'cancelled') return 'Cancelled';
        if (reservation.status === 'completed') return 'Completed';
        if (reservation.confirmation_status === 'rejected') return 'Rejected';
        if (reservation.confirmation_status === 'pending') return 'Pending Approval';
        
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTime24 = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

        if (reservation.date === currentDate) {
            if (reservation.end_time) {
                if (currentTime24 > reservation.end_time) return 'Completed';
                if (currentTime24 >= reservation.start_time) return 'Active';
                return 'Upcoming';
            }
            if (currentTime24 >= reservation.start_time) return 'Active';
            return 'Upcoming';
        }
        if (reservation.date > currentDate) return 'Upcoming';
        return 'Completed';
    }

    async function approveReservation(reservationId) {
        const adminNotes = prompt('Enter admin notes (optional):');
        
        try {
            const response = await fetch(`${API_BASE_URL}/reservations`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: reservationId,
                    action: 'approve',
                    adminNotes: adminNotes
                })
            });

            const result = await response.json();
            if (response.ok) {
                await fetchData();
                alert(result.message);
            } else {
                throw new Error(result.error || 'Failed to approve reservation');
            }
        } catch (error) {
            console.error('Error approving reservation:', error);
            alert(error.message);
        }
    }

    async function rejectReservation(reservationId) {
        const adminNotes = prompt('Enter reason for rejection:');
        if (adminNotes === null) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/reservations`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: reservationId,
                    action: 'reject',
                    adminNotes: adminNotes
                })
            });

            const result = await response.json();
            if (response.ok) {
                await fetchData();
                alert(result.message);
            } else {
                throw new Error(result.error || 'Failed to reject reservation');
            }
        } catch (error) {
            console.error('Error rejecting reservation:', error);
            alert(error.message);
        }
    }

    async function returnVehicle(reservationId) {
        const now = new Date();
        const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const [time, period] = currentTime.split(' ');
        let [hours, minutes] = time.split(':');
        if (period === 'PM' && hours !== '12') {
            hours = String(parseInt(hours) + 12);
        } else if (period === 'AM' && hours === '12') {
            hours = '00';
        }
        const time24 = `${hours}:${minutes}`;

        try {
            const response = await fetch(`${API_BASE_URL}/reservations`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: reservationId,
                    endTime: time24,
                    action: 'return'
                })
            });

            const result = await response.json();
            if (response.ok) {
                await fetchData();
                alert(result.message);
            } else {
                throw new Error(result.error || 'Failed to return vehicle');
            }
        } catch (error) {
            console.error('Error returning vehicle:', error);
            alert(error.message);
        }
    }

    async function cancelReservation(reservationId) {
        const reservation = reservations.find(res => res.id == reservationId);
        if (!reservation) {
            alert('Reservation not found');
            return;
        }

        if (reservation.status === 'cancelled') {
            alert('Reservation is already cancelled');
            return;
        }
        
        if (reservation.status === 'completed' || reservation.end_time !== null) {
            alert('Cannot cancel completed reservation');
            return;
        }

        const now = new Date();
        const reservationDate = new Date(reservation.date + 'T00:00:00');
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (reservationDate < today) {
            alert('Cannot cancel past reservations');
            return;
        }
        
        if (reservationDate.getTime() === today.getTime()) {
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [startHours, startMinutes] = reservation.start_time.split(':').map(Number);
            const startTimeInMinutes = startHours * 60 + startMinutes;
            
            const bufferMinutes = 15;
            if (currentTime > (startTimeInMinutes + bufferMinutes)) {
                alert('Cannot cancel reservation that started more than 15 minutes ago');
                return;
            }
        }

        if (confirm('Are you sure you want to cancel this reservation?')) {
            // Prompt for cancellation reason (optional)
            const cancellationReason = prompt('Please provide a reason for cancellation (optional):');
            
            try {
                const response = await fetch(`${API_BASE_URL}/reservations`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: reservationId,
                        action: 'cancel',
                        cancellationReason: cancellationReason || null
                    })
                });
                
                const result = await response.json();
                if (response.ok) {
                    await fetchData();
                    alert(result.message);
                } else {
                    throw new Error(result.error || 'Failed to cancel reservation');
                }
            } catch (error) {
                console.error('Error cancelling reservation:', error);
                alert(error.message);
            }
        }
    }

    async function deleteVehicle(vehicleId) {
        const hasActiveReservations = reservations.some(res => 
            res.vehicle_id === vehicleId && res.end_time === null
        );
        
        if (hasActiveReservations) {
            alert('Cannot delete vehicle with active reservations!');
            return;
        }
        
        if (confirm('Are you sure you want to delete this vehicle? All reservations for this vehicle will also be deleted.')) {
            try {
                const response = await fetch(`${API_BASE_URL}/vehicles?id=${vehicleId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                if (response.ok) {
                    await fetchData();
                    alert(result.message);
                } else {
                    throw new Error(result.error || 'Failed to delete vehicle');
                }
            } catch (error) {
                console.error('Error deleting vehicle:', error);
                alert(error.message);
            }
        }
    }

    async function deleteReservation(reservationId) {
        if (confirm('Are you sure you want to delete this reservation?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/reservations?id=${reservationId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                if (response.ok) {
                    await fetchData();
                    alert(result.message);
                } else {
                    throw new Error(result.error || 'Failed to delete reservation');
                }
            } catch (error) {
                console.error('Error deleting reservation:', error);
                alert(error.message);
            }
        }
    }

    async function addDriver(name) {
    try {
        const response = await fetch(`${API_BASE_URL}/drivers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name
            })
        });
        
        const result = await response.json();
        if (response.ok) {
            await fetchData();
            alert(`${result.message}\nDriver ID: ${result.id}`);
        } else {
            throw new Error(result.error || 'Failed to add driver');
        }
    } catch (error) {
        console.error('Error adding driver:', error);
        alert(error.message);
    }
}

    async function updateDriver(driverId, name) {
        try {
            const response = await fetch(`${API_BASE_URL}/drivers`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: driverId,
                    name: name
                })
            });
            
            const result = await response.json();
            if (response.ok) {
                await fetchData();
                alert(result.message);
            } else {
                throw new Error(result.error || 'Failed to update driver');
            }
        } catch (error) {
            console.error('Error updating driver:', error);
            alert(error.message);
        }
    }

    async function deleteDriver(driverId) {
        if (confirm('Are you sure you want to delete this driver?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/drivers?id=${driverId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                if (response.ok) {
                    await fetchData();
                    alert(result.message);
                } else {
                    throw new Error(result.error || 'Failed to delete driver');
                }
            } catch (error) {
                console.error('Error deleting driver:', error);
                alert(error.message);
            }
        }
    }

    function openEditVehicleModal(vehicleId) {
        const vehicle = vehicles.find(v => v.id == vehicleId);
        if (!vehicle) return;
        
        editVehicleIdInput.value = vehicle.id;
        editVehicleMakeInput.value = vehicle.make;
        editVehicleModelInput.value = vehicle.model;
        editVehiclePlateInput.value = vehicle.plate;
        
        editVehicleModal.style.display = 'block';
    }

    function openEditDriverModal(driverId) {
        const driver = drivers.find(d => d.id == driverId);
        if (!driver) return;
        
        editDriverIdInput.value = driver.id;
        editDriverNameInput.value = driver.name;
        
        editDriverModal.style.display = 'block';
    }

    async function updateVehicle(vehicleId, make, model, plate) {
        try {
            const response = await fetch(`${API_BASE_URL}/vehicles`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: vehicleId,
                    make,
                    model,
                    plate
                })
            });
            
            const result = await response.json();
            if (response.ok) {
                await fetchData();
                editVehicleModal.style.display = 'none';
                alert(result.message);
            } else {
                throw new Error(result.error || 'Failed to update vehicle');
            }
        } catch (error) {
            console.error('Error updating vehicle:', error);
            alert(error.message);
        }
    }

    function setupEventListeners() {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const tabId = this.getAttribute('data-tab');
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Add this right here - after tab button listeners but before other listeners
    driverSearchInput.addEventListener('input', function() {
        filterDrivers(this.value);
    });

    // Add filter event listeners
    const userFilter = document.getElementById('user-reservation-filter');
    if (userFilter) {
        userFilter.addEventListener('change', function() {
            renderReservations(this.value);
        });
    }

    const adminFilter = document.getElementById('admin-reservation-filter');
    if (adminFilter) {
        adminFilter.addEventListener('change', function() {
            renderAllReservations(this.value);
        });
    }

        reservationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const vehicleId = parseInt(vehicleSelect.value);
            const userName = document.getElementById('name').value;
            const date = document.getElementById('date').value;
            const startTime = document.getElementById('start-time').value;
            const purpose = document.getElementById('purpose').value;
            const assignedDriverId = parseInt(assignedDriverSelect.value);

            try {
                const response = await fetch(`${API_BASE_URL}/reservations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        vehicleId,
                        userName,
                        date,
                        startTime,
                        purpose,
                        assignedDriverId
                    })
                });
                
                const result = await response.json();
                if (response.ok) {
                    await fetchData();
                    reservationForm.reset();
                    alert(result.message);
                } else {
                    throw new Error(result.error || 'Failed to create reservation');
                }
            } catch (error) {
                console.error('Error creating reservation:', error);
                alert(error.message);
            }
        });

        reservationsList.addEventListener('click', function(e) {
            if (e.target.classList.contains('return-btn')) {
                returnVehicle(parseInt(e.target.getAttribute('data-id')));
            }
            if (e.target.classList.contains('cancel-btn')) {
                cancelReservation(parseInt(e.target.getAttribute('data-id')));
            }
        });

        adminView.addEventListener('click', function(e) {
            if (e.target.classList.contains('delete-vehicle-btn')) {
                deleteVehicle(parseInt(e.target.getAttribute('data-id')));
            }
            if (e.target.classList.contains('edit-vehicle-btn')) {
                openEditVehicleModal(parseInt(e.target.getAttribute('data-id')));
            }
            if (e.target.classList.contains('delete-reservation-btn')) {
                deleteReservation(parseInt(e.target.getAttribute('data-id')));
            }
            if (e.target.classList.contains('approve-btn')) {
                approveReservation(parseInt(e.target.getAttribute('data-id')));
            }
            if (e.target.classList.contains('reject-btn')) {
                rejectReservation(parseInt(e.target.getAttribute('data-id')));
            }
            if (e.target.classList.contains('edit-driver-btn')) {
                openEditDriverModal(parseInt(e.target.getAttribute('data-id')));
            }
            if (e.target.classList.contains('delete-driver-btn')) {
                deleteDriver(parseInt(e.target.getAttribute('data-id')));
            }
        });

        addVehicleBtn.addEventListener('click', function() {
            addVehicleModal.style.display = 'block';
        });

        addDriverBtn.addEventListener('click', function() {
            addDriverModal.style.display = 'block';
        });

        closeModal.addEventListener('click', function() {
            addVehicleModal.style.display = 'none';
        });

        closeEditModal.addEventListener('click', function() {
            editVehicleModal.style.display = 'none';
        });

        closeDriverModal.addEventListener('click', function() {
            addDriverModal.style.display = 'none';
        });

        closeEditDriverModal.addEventListener('click', function() {
            editDriverModal.style.display = 'none';
        });

        window.addEventListener('click', function(e) {
            if (e.target === addVehicleModal) {
                addVehicleModal.style.display = 'none';
            }
            if (e.target === editVehicleModal) {
                editVehicleModal.style.display = 'none';
            }
            if (e.target === addDriverModal) {
                addDriverModal.style.display = 'none';
            }
            if (e.target === editDriverModal) {
                editDriverModal.style.display = 'none';
            }
        });

        addVehicleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const make = document.getElementById('vehicle-make').value;
            const model = document.getElementById('vehicle-model').value;
            const plate = document.getElementById('vehicle-plate').value.toUpperCase();

            try {
                const response = await fetch(`${API_BASE_URL}/vehicles`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        make,
                        model,
                        plate
                    })
                });
                
                const result = await response.json();
                if (response.ok) {
                    await fetchData();
                    addVehicleForm.reset();
                    addVehicleModal.style.display = 'none';
                    alert(result.message);
                } else {
                    throw new Error(result.error || 'Failed to add vehicle');
                }
            } catch (error) {
                console.error('Error adding vehicle:', error);
                alert(error.message);
            }
        });

        editVehicleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const vehicleId = parseInt(editVehicleIdInput.value);
            const make = editVehicleMakeInput.value;
            const model = editVehicleModelInput.value;
            const plate = editVehiclePlateInput.value.toUpperCase();

            await updateVehicle(vehicleId, make, model, plate);
        });

        addDriverForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('driver-name').value;

            await addDriver(name);
            addDriverForm.reset();
            addDriverModal.style.display = 'none';
        });

        editDriverForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const driverId = parseInt(editDriverIdInput.value);
            const name = editDriverNameInput.value;

            await updateDriver(driverId, name);
            editDriverModal.style.display = 'none';
        });
    }

    init();
});