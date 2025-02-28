import { useState } from "react";
import QRScanner from "./QRScanner";

function App() {
    const [scannedResults, setScannedResults] = useState([]);
    const [scannedBy, setScannedBy] = useState(""); // Store scanner's name
    const [isNameConfirmed, setIsNameConfirmed] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedQuantity, setEditedQuantity] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isScanningName, setIsScanningName] = useState(false);

    // ✅ Confirms the name and allows access to the scanner
    const confirmName = () => {
        if (scannedBy.trim() === "") {
            alert("Please enter or scan your name.");
            return;
        }
        setIsNameConfirmed(true);
    };

    // ✅ Handles QR scanning of product codes
    const handleScan = (data) => {
        if (!data || !isNameConfirmed) return; // Prevent scanning if name is not confirmed
        const [productName, quantity] = data.split(",");

        setScannedResults((prev) => [
            ...prev,
            { id: prev.length + 1, productName, quantity: parseInt(quantity) }
        ]);
    };

    // ✅ Handles scanning a name QR code
    const handleScanName = (name) => {
        setScannedBy(name);
        setIsScanningName(false); // Close name scanner after scanning
    };

    // ✅ Edit Functionality
    const handleEdit = (index) => {
        setEditingIndex(index);
        setEditedQuantity(scannedResults[index].quantity);
    };

    // ✅ Save Edited Quantity
    const handleSave = (index) => {
        setScannedResults((prev) =>
            prev.map((item, i) =>
                i === index ? { ...item, quantity: parseInt(editedQuantity) } : item
            )
        );
        setEditingIndex(null);
    };

    // ✅ Delete Item
    const handleDelete = (index) => {
        setScannedResults((prev) => prev.filter((_, i) => i !== index));
    };

    // ✅ Reset the entire app to start from the beginning
    const handleReset = () => {
        setScannedResults([]);  // Clear scanned items
        setScannedBy("");       // Clear name input
        setIsNameConfirmed(false); // Require name input again
        setEditingIndex(null);
        setEditedQuantity("");
        // ✅ Refresh the browser
        window.location.reload();
    };

    // ✅ Save data to MongoDB
    const saveToDatabase = async () => {
        if (scannedResults.length === 0) {
            alert("No scanned data to save.");
            return;
        }

        if (!scannedBy.trim()) {
            alert("Error: Name is missing! Please re-enter your name.");
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch("https://kurachi.onrender.com/saveScannedQRData", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ scannedBy, scannedResults }), // ✅ Include scannedBy
            });

            if (response.ok) {
                alert("Data saved successfully!");
                handleReset(); // ✅ Reset app after saving
            } else {
                alert("Failed to save data.");
            }
        } catch (error) {
            console.error("Error saving data:", error);
            alert("An error occurred while saving.");
        }

        setIsSaving(false);
    };

    return (
        <div>
            <h1>Testing 在庫 QR Scanner QR / スキャナー</h1>

            {/* ✅ Name Input Section */}
            <div className="name-input-container">
                <div className="name-input-row">
                    <input
                        type="text"
                        value={scannedBy}
                        onChange={(e) => setScannedBy(e.target.value)}
                        placeholder="名前入れてください..."
                        disabled={isNameConfirmed}
                    />
                    <button onClick={() => setIsScanningName(true)} disabled={isNameConfirmed} className="scan-name-btn">
                        名前スキャン
                    </button>
                    <button onClick={confirmName} disabled={isNameConfirmed} className="ok-btn">
                        OK
                    </button>
                </div>
            </div>

            {/* ✅ Show scanner only if the name is confirmed */}
            {isNameConfirmed && <QRScanner onScan={handleScan} />}

            <h3>Scanned Results:</h3>
            <ul>
                {scannedResults.map((item, index) => (
                    <li key={index}>
                        <strong>{index + 1}. 品番:</strong> {item.productName} | 
                        <strong> 収容数:</strong> 
                        {editingIndex === index ? (
                            <input
                                type="number"
                                value={editedQuantity}
                                onChange={(e) => setEditedQuantity(e.target.value)}
                                className="edit-input"
                            />
                        ) : (
                            <span> {item.quantity} </span>
                        )}

                        {editingIndex === index ? (
                            <button onClick={() => handleSave(index)} className="save-edit-button">Save</button>
                        ) : (
                            <button onClick={() => handleEdit(index)} className="edit-button">Edit</button>
                        )}

                        <button onClick={() => handleDelete(index)} className="delete-button">Delete</button>
                    </li>
                ))}
            </ul>

            {/* ✅ Save & Reset Buttons */}
            <div className="button-group">
                <button onClick={saveToDatabase} disabled={isSaving} className="save-button">
                    {isSaving ? "Saving..." : "Save to Database"}
                </button>
                <button onClick={handleReset} className="reset-button">
                    Reset
                </button>
            </div>

            {/* ✅ Name QR Scanner */}
            {isScanningName && (
                <div>
                    <h3>Scan Your Name</h3>
                    <QRScanner onScan={handleScanName} />
                    <button onClick={() => setIsScanningName(false)}>Cancel</button>
                </div>
            )}
        </div>
    );
}

export default App;
