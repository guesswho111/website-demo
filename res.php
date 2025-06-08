<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vehicle Reservation System</title>
    <link rel="stylesheet" href="res.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Vehicle Reservation System</h1>
            <div class="tabs">
                <button class="tab-btn active" data-tab="user-view">User View</button>
                <button class="tab-btn" data-tab="admin-view">Admin View</button>
            </div>
        </header>

        <div class="tab-content active" id="user-view">
            <div class="main-content">
                <div class="sidebar">
                    <h2>Available Vehicles</h2>
                    <div id="vehicle-list" class="vehicle-list"></div>

                    <h2>Make a Reservation</h2>
                    <form id="reservation-form">
                        <div class="form-group">
                            <label for="vehicle-select">Select Vehicle:</label>
                            <select id="vehicle-select" required>
                                <option value="">-- Select a Vehicle --</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="name">Your Name:</label>
                            <input type="text" id="name" required>
                        </div>
                        <div class="form-group">
                            <label for="date">Date:</label>
                            <input type="date" id="date" required>
                        </div>
                        <div class="form-group">
                            <label for="start-time">Start Time:</label>
                            <input type="time" id="start-time" required>
                        </div>
                        <div class="form-group">
                            <label for="purpose">Purpose:</label>
                            <textarea id="purpose" rows="3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="assigned-driver">Assigned Driver:</label>
                            <select id="assigned-driver" required>
                                <option value="">-- Assigned Driver --</option>
                            </select>
                        </div>
                        <button type="submit">Reserve Vehicle</button>
                    </form>
                </div>

                <div class="content">
                    <h2>Your Reservations</h2>
                    <div class="form-group">
                <label for="user-reservation-filter">Filter by Creation Date:</label>
                    <select id="user-reservation-filter">
                    <option value="all">All Reservations</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                </select>
                        </div>
                    <div id="reservations" class="reservations-list"></div>
                </div>
            </div>
        </div>

        <div class="tab-content" id="admin-view">
            <div class="admin-controls">
                <button id="add-vehicle-btn">Add New Vehicle</button>
                <button id="add-driver-btn">Add New Driver</button>
            </div>
            
            <div class="vehicle-status-container">
                <h2>Vehicle Status Dashboard</h2>
                <div id="vehicle-status" class="vehicle-status"></div>
            </div>

            <div class="driver-management">
    <h2>Driver Management</h2>
    <div class="form-group">
        <label for="driver-search">Search Drivers:</label>
        <input type="text" id="driver-search" placeholder="Search by name or ID">
    </div>
    <div id="drivers-list" class="drivers-list"></div>
</div>

            <div class="all-reservations">
                <h2>All Reservations</h2>
                <div class="form-group">
    <label for="admin-reservation-filter">Filter by Creation Date:</label>
    <select id="admin-reservation-filter">
        <option value="all">All Reservations</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
    </select>
</div>
                <div id="all-reservations-list" class="reservations-list"></div>
            </div>
        </div>

        <!-- Add Vehicle Modal -->
        <div id="add-vehicle-modal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Add New Vehicle</h2>
                <form id="add-vehicle-form">
                    <div class="form-group">
                        <label for="vehicle-make">Brand:</label>
                        <input type="text" id="vehicle-make" required>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-model">Model:</label>
                        <input type="text" id="vehicle-model" required>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-plate">License Plate:</label>
                        <input type="text" id="vehicle-plate" required>
                    </div>
                    <button type="submit">Add Vehicle</button>
                </form>
            </div>
        </div>

        <!-- Edit Vehicle Modal -->
        <div id="edit-vehicle-modal" class="modal">
            <div class="modal-content">
                <span class="close-edit">&times;</span>
                <h2>Edit Vehicle</h2>
                <form id="edit-vehicle-form">
                    <input type="hidden" id="edit-vehicle-id">
                    <div class="form-group">
                        <label for="edit-vehicle-make">Brand:</label>
                        <input type="text" id="edit-vehicle-make" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-vehicle-model">Model:</label>
                        <input type="text" id="edit-vehicle-model" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-vehicle-plate">License Plate:</label>
                        <input type="text" id="edit-vehicle-plate" required>
                    </div>
                    <button type="submit">Update Vehicle</button>
                </form>
            </div>
        </div>

        <!-- Add Driver Modal -->
        <div id="add-driver-modal" class="modal">
            <div class="modal-content">
                <span class="close-driver">&times;</span>
                <h2>Add New Driver</h2>
                <form id="add-driver-form">
                    <div class="form-group">
                        <label for="driver-name">Driver Name:</label>
                        <input type="text" id="driver-name" required>
                    </div>
                    <button type="submit">Add Driver</button>
                </form>
            </div>
        </div>

        <!-- Edit Driver Modal -->
        <div id="edit-driver-modal" class="modal">
            <div class="modal-content">
                <span class="close-edit-driver">&times;</span>
                <h2>Edit Driver</h2>
                <form id="edit-driver-form">
                    <input type="hidden" id="edit-driver-id">
                    <div class="form-group">
                        <label for="edit-driver-name">Driver Name:</label>
                        <input type="text" id="edit-driver-name" required>
                    </div>
                    <button type="submit">Update Driver</button>
                </form>
            </div>
        </div>
    </div>

    <script src="res.js"></script>
</body>
</html>