import { useState, useEffect } from "react";
import QRScanner from "./QRScanner";

const serverURL = "https://kurachi.onrender.com";
//const serverURL = "http://localhost:3000"; //For testing on local server
const room = "390748940"; // Chatwork Room ID "肥田瀬QR在庫"

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
    const [factoryValue, setFactoryValue] = useState(""); // Store factory value

    // ✅ Parse factoryValue from URL on page load
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const factory = params.get("factoryValue");
        if (factory) {
            setFactoryValue(factory);
        }
    }, []);

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

    // ✅ Save data to MongoDB
    const saveToDatabase = async () => {
        if (scannedResults.length === 0) {
            alert("No scanned data to save. / スキャンデータがありません.");
            return;
        }

        if (!scannedBy.trim()) {
            alert("Error: 名前入れてください.");
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch(`${serverURL}/saveScannedQRData`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ scannedBy, scannedResults }), // ✅ Include scannedBy
            });

            if (response.ok) {
                alert("Data saved successfully!");
                handleReset(); // ✅ Reset app after saving

                // ✅ If factoryValue is "肥田瀬", call getMonthlyInventoryData
                if (factoryValue === "肥田瀬") {
                    await getMonthlyInventoryData();
                }
            } else {
                alert("Failed to save data.");
            }
        } catch (error) {
            console.error("Error saving data:", error);
            alert("An error occurred while saving.");
        }

        setIsSaving(false);
    };

    // ✅ Function to retrieve monthly data and send a message to Chatwork
    const getMonthlyInventoryData = async () => {
        const url = `${serverURL}/queries`;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const formatDate = (date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        };

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        const aggregation = [
            {
                $match: {
                    工場: "肥田瀬",
                    Date: {
                        $gte: new Date(formattedStartDate),
                        $lte: new Date(formattedEndDate),
                    },
                },
            },
            {
                $group: {
                    _id: "$Date",
                    items: {
                        $push: {
                            品番: "$品番",
                            quantity: "$Quantity",
                        },
                    },
                    totalQuantity: { $sum: "$Quantity" },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ];

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: "inventoryDB",
                    aggregation,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Monthly Inventory Data:", result);

                const summary = result.reduce((acc, curr) => {
                    curr.items.forEach((item) => {
                        if (!acc[item.品番]) {
                            acc[item.品番] = 0;
                        }
                        acc[item.品番] += item.quantity;
                    });
                    return acc;
                }, {});

                const detailedBreakdown = result
                    .map((day) => {
                        const date = formatDate(new Date(day._id));
                        const items = day.items
                            .map((item, index) => `${index + 1}. ${item.品番}: ${item.quantity}`)
                            .join("\n");
                        return `日付: ${date}\n${items}`;
                    })
                    .join("\n\n");

                const summaryMessage = Object.entries(summary)
                    .map(([品番, quantity], index) => `${index + 1}. ${品番}: ${quantity}`)
                    .join("\n");

                const message = `今月のデータ： ${formattedStartDate} - ${formattedEndDate}:\n\n${detailedBreakdown}\n\nまとめ：\n${summaryMessage}`;

                await sendMessageToChatwork(message, room);
            } else {
                console.error("Failed to retrieve monthly data:", response.status, await response.text());
            }
        } catch (error) {
            console.error("Error retrieving monthly data:", error);
        }
    };

    // ✅ Function to send a message to Chatwork
    const sendMessageToChatwork = async (message, roomId) => {
        try {
            const response = await fetch(`${serverURL}/inventoryChat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message, roomId }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Message sent successfully:", result);
            } else {
                console.error("Failed to send message:", response.status, await response.text());
            }
        } catch (error) {
            console.error("Error sending message to Chatwork:", error);
        }
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

    return (
        <div>
            <h1>在庫 QR Scanner QR / スキャナー</h1>

            {/* ✅ Scanner Selection */}
            {!scannerType && (
                <div className="scanner-selection">
                    <h3>Select Scanner Type:</h3>
                    <button onClick={() => setScannerType("camera")}>📷 カメラスキャン</button>
                    <button onClick={() => setScannerType("bluetooth")}>🔵 ブルースススキャナー</button>
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
                        <button onClick={() => setIsScanningName(true)} disabled={isNameConfirmed}>
                            名前スキャン
                        </button>
                        <button onClick={confirmName} disabled={isNameConfirmed}>
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* ✅ Bluetooth Scanner Ready Indicator */}
            {scannerType === "bluetooth" && isNameConfirmed && isBluetoothReady && (
                <div className="bluetooth-ready-indicator">
                    ✅ <strong>Bluetooth scanner is ready!</strong> スキャン初めてください.
                </div>
            )}

            {/* ✅ Show Camera Scanner Only If Camera Mode is Selected */}
            {scannerType === "camera" && isNameConfirmed && <QRScanner onScan={handleScan} />}

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
                            />
                        ) : (
                            <span> {item.quantity} </span>
                        )}

                        {editingIndex === index ? (
                            <button onClick={() => handleSave(index)}>Save</button>
                        ) : (
                            <button onClick={() => handleEdit(index)}>Edit</button>
                        )}

                        <button onClick={() => handleDelete(index)}>Delete</button>
                    </li>
                ))}
            </ul>

            {/* ✅ Save & Reset Buttons */}
            <div className="button-group">
                <button onClick={saveToDatabase} disabled={isSaving}>
                    {isSaving ? "Saving..." : "保存"}
                </button>
                <button onClick={handleReset}>リセット</button>
            </div>
        </div>
    );
}

export default App;