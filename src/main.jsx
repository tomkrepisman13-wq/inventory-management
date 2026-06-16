import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserMultiFormatReader } from '@zxing/browser';
import emailjs from '@emailjs/browser';
import {
  AlertTriangle,
  Barcode,
  Camera,
  Check,
  Mail,
  Menu,
  Minus,
  PackagePlus,
  Plus,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'inventory_items';

const emailConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

const exampleItems = [
  { barcode: '7290000000011', name: 'חלב', quantity: 2 },
  { barcode: '7290000000028', name: 'לחם', quantity: 1 },
  { barcode: '7290000000035', name: 'ביצים', quantity: 12 },
  { barcode: '7290000000042', name: 'אורז', quantity: 3 },
];

export function getInventory() {
  try {
    const rawItems = localStorage.getItem(STORAGE_KEY);
    if (!rawItems) {
      saveInventory(exampleItems);
      return exampleItems;
    }

    const parsedItems = JSON.parse(rawItems);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

export function saveInventory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function findItemByBarcode(barcode) {
  return getInventory().find((item) => item.barcode === barcode);
}

export function addItem(item) {
  const items = getInventory();
  const existingItem = items.find((currentItem) => currentItem.barcode === item.barcode);

  const nextItems = existingItem
    ? items.map((currentItem) => (currentItem.barcode === item.barcode ? item : currentItem))
    : [...items, item];

  saveInventory(nextItems);
  return nextItems;
}

export function increaseQuantity(barcode) {
  const nextItems = getInventory().map((item) =>
    item.barcode === barcode ? { ...item, quantity: item.quantity + 1 } : item,
  );
  saveInventory(nextItems);
  return nextItems;
}

export function decreaseQuantity(barcode) {
  const nextItems = getInventory().map((item) =>
    item.barcode === barcode ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item,
  );
  saveInventory(nextItems);
  return nextItems;
}

function createInventoryReport(items) {
  const rows = items.map((item) => `${item.name} | ברקוד: ${item.barcode} | כמות: ${item.quantity}`);
  return ['דוח מלאי', '---------', ...rows].join('\n');
}

export async function exportInventoryToEmail(email) {
  const items = getInventory();
  const inventoryReport = createInventoryReport(items);
  const hasEmailJsConfig = emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey;

  if (hasEmailJsConfig) {
    await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templateId,
      {
        to_email: email,
        inventory_report: inventoryReport,
        inventory_json: JSON.stringify(items, null, 2),
      },
      { publicKey: emailConfig.publicKey },
    );
    alert(`הדוח נשלח בהצלחה אל ${email}`);
    return;
  }

  const subject = encodeURIComponent('דוח מלאי');
  const body = encodeURIComponent(inventoryReport);
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}

const screens = {
  home: 'home',
  scanner: 'scanner',
  found: 'found',
  notFound: 'notFound',
  edit: 'edit',
  exportEmail: 'exportEmail',
};

function Header({ onMenuClick }) {
  return (
    <header className="app-header">
      <button className="icon-button header-menu" aria-label="תפריט" onClick={onMenuClick}>
        <Menu size={28} />
      </button>
      <h1>ניהול מלאי</h1>
    </header>
  );
}

function App() {
  const [screen, setScreen] = useState(screens.home);
  const [items, setItems] = useState([]);
  const [selectedBarcode, setSelectedBarcode] = useState('');

  useEffect(() => {
    setItems(getInventory());
  }, []);

  const selectedItem = useMemo(
    () => items.find((item) => item.barcode === selectedBarcode),
    [items, selectedBarcode],
  );

  const refreshItems = () => setItems(getInventory());

  const handleScan = (barcode) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    setSelectedBarcode(cleanBarcode);
    const item = findItemByBarcode(cleanBarcode);
    setItems(getInventory());
    setScreen(item ? screens.found : screens.notFound);
  };

  const handleAddItem = (item) => {
    const nextItems = addItem(item);
    setItems(nextItems);
    setSelectedBarcode(item.barcode);
    setScreen(screens.found);
  };

  const handleIncrease = (barcode) => {
    setItems(increaseQuantity(barcode));
  };

  const handleDecrease = (barcode) => {
    setItems(decreaseQuantity(barcode));
  };

  return (
    <div className="page-shell">
      <div className="phone-app">
        <Header onMenuClick={() => setScreen(screens.home)} />
        <main className="screen">
          {screen === screens.home && (
            <HomeScreen
              onScan={() => setScreen(screens.scanner)}
              onEdit={() => {
                refreshItems();
                setScreen(screens.edit);
              }}
            />
          )}

          {screen === screens.scanner && (
            <BarcodeScannerScreen onCancel={() => setScreen(screens.home)} onScan={handleScan} />
          )}

          {screen === screens.found && selectedItem && (
            <ItemFoundScreen
              item={selectedItem}
              onIncrease={() => handleIncrease(selectedItem.barcode)}
              onDecrease={() => handleDecrease(selectedItem.barcode)}
              onExport={() => setScreen(screens.exportEmail)}
            />
          )}

          {screen === screens.notFound && (
            <ItemNotFoundScreen
              barcode={selectedBarcode}
              onAddItem={handleAddItem}
              onScanAgain={() => setScreen(screens.scanner)}
            />
          )}

          {screen === screens.edit && (
            <EditInventoryScreen
              items={items}
              onAdd={(item) => setItems(addItem(item))}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
            />
          )}

          {screen === screens.exportEmail && <ExportEmailScreen onSend={() => setScreen(screens.home)} />}
        </main>
      </div>
    </div>
  );
}

function HomeScreen({ onScan, onEdit }) {
  return (
    <section className="home-screen">
      <div className="hero-copy">
        <h2>ברוכים הבאים!</h2>
        <p>סרוק ברקוד של מוצר כדי לצפות בפרטים ולעדכן מלאי</p>
      </div>

      <button className="scan-card" onClick={onScan}>
        <Barcode size={72} strokeWidth={1.8} />
        <span>סרוק ברקוד</span>
      </button>

      <button className="secondary-action" onClick={onEdit}>
        ערוך רשימה
      </button>
    </section>
  );
}

function BarcodeScannerScreen({ onCancel, onScan }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const didScanRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannerStatus, setScannerStatus] = useState('לחץ על הפעלת מצלמה כדי להתחיל סריקה');
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  const getCameraErrorMessage = (error) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return 'הדפדפן הזה לא תומך בהפעלת מצלמה. נסה לפתוח בכרום או בספארי בטלפון.';
    }

    if (error?.name === 'NotAllowedError') {
      return 'לא ניתנה הרשאת מצלמה. פתח את הרשאות האתר בדפדפן ואפשר גישה למצלמה.';
    }

    if (error?.name === 'NotFoundError') {
      return 'לא נמצאה מצלמה זמינה במכשיר הזה.';
    }

    if (error?.name === 'NotReadableError') {
      return 'המצלמה תפוסה באפליקציה אחרת. סגור מצלמות אחרות ונסה שוב.';
    }

    return 'לא ניתן להפעיל מצלמה כאן. אפשר לנסות בדפדפן חיצוני או להזין ברקוד ידנית.';
  };

  const startScanner = async () => {
    controlsRef.current?.stop();
    didScanRef.current = false;
    setCameraError('');
    setIsScanning(true);
    setScannerStatus('מבקש הרשאת מצלמה...');

    try {
      const reader = new BrowserMultiFormatReader();
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      controlsRef.current = await reader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result) => {
          if (!result || didScanRef.current) return;

          didScanRef.current = true;
          controlsRef.current?.stop();
          setIsScanning(false);
          onScan(result.getText());
        },
      );

      setScannerStatus('המצלמה פעילה. כוון את הברקוד למסגרת');
    } catch (error) {
      setIsScanning(false);
      setScannerStatus('לא ניתן להפעיל מצלמה');
      setCameraError(getCameraErrorMessage(error));
      console.error('Camera scanner failed:', error);
    }
  };

  const handleManualScan = (event) => {
    event.preventDefault();
    onScan(manualBarcode);
  };

  return (
    <section className="scanner-screen">
      <div className="screen-heading">
        <h2>סריקת ברקוד</h2>
        <p>כוון את המצלמה אל הברקוד כדי לסרוק מוצר</p>
      </div>

      <div className="camera-preview" aria-label="תצוגת מצלמה לסריקת ברקוד">
        <video ref={videoRef} className="camera-video" muted playsInline />
        <div className="camera-shade" />
        <div className="scan-corners" />
        <div className="scan-line" />
        <div className="camera-status">
          <Camera size={20} />
          <span>{scannerStatus}</span>
        </div>
      </div>

      {cameraError && <p className="inline-error">{cameraError}</p>}

      <button className="primary-action compact" onClick={startScanner} disabled={isScanning}>
        <Camera size={22} />
        {isScanning ? 'מפעיל מצלמה...' : 'הפעל מצלמה'}
      </button>

      <form className="manual-scan-panel" onSubmit={handleManualScan}>
        <label htmlFor="manual-barcode">הזנת ברקוד ידנית</label>
        <input
          id="manual-barcode"
          value={manualBarcode}
          inputMode="numeric"
          placeholder="לדוגמה: 7290000000011"
          onChange={(event) => setManualBarcode(event.target.value)}
        />
        <button className="primary-action compact" type="submit">
          בדוק ברקוד
        </button>
      </form>

      <button className="bottom-action cancel-action" onClick={onCancel}>
        ביטול
      </button>
    </section>
  );
}

function ItemFoundScreen({ item, onIncrease, onDecrease, onExport }) {
  return (
    <section className="item-found-screen">
      <div className="status-banner success">
        <Check size={24} />
        <span>הפריט נקלט בהצלחה</span>
      </div>

      <section className="details-panel">
        <h2>זיהוי הפריט</h2>
        <div className="detail-row">
          <span>שם פריט</span>
          <strong>{item.name}</strong>
        </div>
        <div className="detail-row">
          <span>כמות נוכחית</span>
          <strong>{item.quantity}</strong>
        </div>
      </section>

      <section className="quantity-card" aria-label="עדכון כמות">
        <button className="round-action plus" aria-label="הגדל כמות" onClick={onIncrease}>
          <Plus />
        </button>
        <span>{item.quantity}</span>
        <button className="round-action minus" aria-label="הקטן כמות" onClick={onDecrease}>
          <Minus />
        </button>
      </section>

      <button className="primary-action" onClick={onExport}>
        ייצוא למייל
      </button>
    </section>
  );
}

function ItemNotFoundScreen({ barcode, onAddItem, onScanAgain }) {
  const [form, setForm] = useState({
    barcode,
    name: '',
    quantity: '',
  });

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.barcode.trim() || !form.name.trim()) return;

    onAddItem({
      barcode: form.barcode.trim(),
      name: form.name.trim(),
      quantity: Number(form.quantity) || 0,
    });
  };

  return (
    <section className="not-found-screen">
      <h2 className="standalone-title">פריט לא נמצא</h2>

      <div className="status-banner danger">
        <AlertTriangle size={24} />
        <span>הפריט לא נמצא</span>
      </div>

      <p className="muted-copy">לא נמצא פריט תואם לברקוד שנסרק</p>
      <input className="disabled-input" value={barcode} disabled aria-label="הברקוד שנסרק" />

      <form className="form-card" onSubmit={handleSubmit}>
        <h3>הוסף פריט חדש</h3>
        <label>
          ברקוד
          <input value={form.barcode} onChange={(event) => updateField('barcode', event.target.value)} />
        </label>
        <label>
          שם מוצר
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <label>
          מלאי
          <input
            type="number"
            min="0"
            value={form.quantity}
            onChange={(event) => updateField('quantity', event.target.value)}
          />
        </label>
        <button className="primary-action" type="submit">
          הוסף פריט
        </button>
      </form>

      <button className="secondary-action" onClick={onScanAgain}>
        סרוק שוב
      </button>
    </section>
  );
}

function EditInventoryScreen({ items, onAdd, onIncrease, onDecrease }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    onAdd({
      barcode: Date.now().toString(),
      name: name.trim(),
      quantity: Number(quantity) || 0,
    });
    setName('');
    setQuantity('');
  };

  return (
    <section className="edit-screen">
      <h2 className="standalone-title">ערוך רשימה</h2>

      <div className="inventory-list">
        {items.map((item) => (
          <article className="inventory-row" key={item.barcode}>
            <div>
              <strong>{item.name}</strong>
              <span>כמות: {item.quantity}</span>
            </div>
            <div className="row-actions">
              <button
                className="mini-action plus"
                aria-label={`הגדל כמות של ${item.name}`}
                onClick={() => onIncrease(item.barcode)}
              >
                <Plus size={18} />
              </button>
              <button
                className="mini-action minus"
                aria-label={`הקטן כמות של ${item.name}`}
                onClick={() => onDecrease(item.barcode)}
              >
                <Minus size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <form className="form-card add-item-card" onSubmit={handleSubmit}>
        <h3>הוספת פריט</h3>
        <label>
          שם פריט
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          כמות
          <input type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </label>
        <button className="primary-action" type="submit">
          <PackagePlus size={22} />
          הוסף
        </button>
      </form>
    </section>
  );
}

function ExportEmailScreen({ onSend }) {
  const [email, setEmail] = useState('example@example.com');
  const [status, setStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSending(true);
    setStatus('');

    try {
      await exportInventoryToEmail(email);
      setStatus(emailConfig.serviceId ? 'הדוח נשלח בהצלחה.' : 'נפתח מייל מוכן לשליחה.');
      onSend();
    } catch {
      setStatus('לא הצלחנו לשלוח את הדוח. בדוק את הגדרות EmailJS ונסה שוב.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="export-screen">
      <h2 className="standalone-title">ייצוא למייל</h2>
      <form className="email-card" onSubmit={handleSubmit}>
        <h3>שליחת דוח מלאי</h3>
        <p>הזן את כתובת המייל</p>
        <input
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button className="primary-action" type="submit" disabled={isSending}>
          <Mail size={22} />
          {isSending ? 'שולח...' : 'שלח'}
        </button>
        {status && <p className="form-status">{status}</p>}
      </form>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
