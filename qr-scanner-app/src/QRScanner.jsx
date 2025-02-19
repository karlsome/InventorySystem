import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ onScan }) => {
    const [isScanning, setIsScanning] = useState(true);
    const [scannerInstance, setScannerInstance] = useState(null);
    const [scanComplete, setScanComplete] = useState(false); // ✅ Track scan status

    useEffect(() => {
        if (!isScanning) return;

        const scanner = new Html5QrcodeScanner("qr-reader", {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        });

        scanner.render(
            (decodedText) => {
                setScanComplete(true); // ✅ Mark scan as complete
                setIsScanning(false); // ✅ Stop scanning
                onScan(decodedText);
                stopScanner(scanner);
            },
            (error) => {}
        );

        setScannerInstance(scanner);

        return () => {
            stopScanner(scanner);
        };
    }, [isScanning, onScan]);

    const stopScanner = async (scanner) => {
        try {
            if (scanner) {
                await scanner.clear();
            }
            stopCameraStream(); // ✅ Fully stop the camera
        } catch (err) {
            console.error("Scanner cleanup error:", err);
        }
    };

    // ✅ Fully release the camera
    const stopCameraStream = async () => {
        try {
            const mediaDevices = navigator.mediaDevices;
            if (mediaDevices && mediaDevices.getUserMedia) {
                const stream = await mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((track) => track.stop()); // Stop all camera tracks
            }
        } catch (err) {
            console.error("Error stopping camera:", err);
        }
    };

    // ✅ Restart scanning
    const handleScanAgain = () => {
        setScanComplete(false); // ✅ Reset scan status
        setIsScanning(true); // ✅ Restart scanner
    };

    return (
        <div>
            <h2>Scan a QR Code</h2>
            {isScanning ? (
                <div id="qr-reader"></div>
            ) : (
                <p>スキャンしました!</p>
            )}

            {/* ✅ Show "Scan Again" button after scanning */}
            {scanComplete && (
                <button onClick={handleScanAgain} style={{ marginTop: "10px" }}>
                    再度スキャン
                </button>
            )}
        </div>
    );
};

export default QRScanner;
