import { useState, useEffect } from "react";
import QRScanner from "./QRScanner";

function App() {
    const [scannedResults, setScannedResults] = useState([]);
    const [scannedBy, setScannedBy] = useState(""); // Store scanner's name
    const [isNameConfirmed, setIsNameConfirmed] = useState(false);
    const [isBluetoothReady, setIsBluetoothReady] = useState(false); // ✅ Indicator state
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedQuantity, setEditedQuantity] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isScanningName, setIsScanningName] = useState(false);
    const [barcodeBuffer, setBarcodeBuffer] = useState(""); // Stores scanned barcode data
    const [scannerType, setScannerType] = useState(null); // "camera" or "bluetooth"

    // ✅ Confirms the name and allows access to the scanner
    const confirmName = () => {
        if (scannedBy.trim() === "") {
            alert("Please enter or scan your name.");
            return;
        }
        setIsNameConfirmed(true);

        // ✅ If Bluetooth scanner is selected, show the ready indicator
        if (scannerType === "bluetooth") {
            setIsBluetoothReady(true);
        }
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

    // ✅ Bluetooth Barcode Scanner Support (Only if Bluetooth mode is selected)
    useEffect(() => {
        if (scannerType !== "bluetooth") return; // Only enable keyboard input when Bluetooth is selected

        let bufferTimeout; // Timeout to clear buffer if incomplete scan

        const handleKeyDown = (event) => {
            if (!isNameConfirmed) return; // Ignore input if name is not confirmed

            if (event.key === "Enter") {
                if (barcodeBuffer.trim() !== "") {
                    handleScan(barcodeBuffer.trim());
                    setBarcodeBuffer(""); // Reset after processing
                }
            } else if (event.key.length === 1) {
                // Append only valid characters (ignore Shift, Ctrl, etc.)
                setBarcodeBuffer((prev) => prev + event.key);

                // Reset buffer if no more input within 500ms (prevents partial scans)
                clearTimeout(bufferTimeout);
                bufferTimeout = setTimeout(() => setBarcodeBuffer(""), 500);
            }
        };

        // Listen for keyboard input (Bluetooth scanner simulation)
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            clearTimeout(bufferTimeout);
        };
    }, [barcodeBuffer, isNameConfirmed, scannerType]);

    // ✅ Reset the entire app to start from the beginning
    const handleReset = () => {
        setScannedResults([]);  // Clear scanned items
        setScannedBy("");       // Clear name input
        setIsNameConfirmed(false); // Require name input again
        setEditingIndex(null);
        setEditedQuantity("");
        setScannerType(null); // Reset scanner selection
        setBarcodeBuffer("");
        setIsBluetoothReady(false);
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

            {/* ✅ Scanner Selection */}
            {!scannerType && (
                <div className="scanner-selection">
                    <h3>Select Scanner Type:</h3>
                    <button onClick={() => setScannerType("camera")}>📷 Use Camera Scanner</button>
                    <button onClick={() => setScannerType("bluetooth")}>🔵 Use Bluetooth Scanner</button>
                </div>
            )}

            {/* ✅ Name Input Section */}
            {scannerType && (
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
            )}

            {/* ✅ Bluetooth Scanner Ready Indicator */}
            {scannerType === "bluetooth" && isNameConfirmed && isBluetoothReady && (
                <div className="bluetooth-ready-indicator">
                    ✅ <strong>Bluetooth scanner is ready!</strong> You can now scan barcodes.
                </div>
            )}

            {/* ✅ Show Camera Scanner Only If Camera Mode is Selected */}
            {scannerType === "camera" && isNameConfirmed && <QRScanner onScan={handleScan} />}

            <h3>Scanned Results:</h3>
            <ul>
                {scannedResults.map((item, index) => (
                    <li key={index}>
                        <strong>{index + 1}. 品番:</strong> {item.productName} | 
                        <strong> 収容数:</strong> {item.quantity}
                        <button onClick={() => handleDelete(index)}>Delete</button>
                    </li>
                ))}
            </ul>

            {/* ✅ Save & Reset Buttons */}
            <div className="button-group">
                <button onClick={saveToDatabase} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save to Database"}
                </button>
                <button onClick={handleReset}>Reset</button>
            </div>
        </div>
    );
}

export default App;