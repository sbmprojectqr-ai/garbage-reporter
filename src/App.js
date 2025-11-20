import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, CheckCircle, Upload, Leaf } from 'lucide-react';

export default function GarbageReportApp() {
  const [step, setStep] = useState('welcome');
  const [imagePreview, setImagePreview] = useState(null);
  const [compressedImage, setCompressedImage] = useState(null);
  const [formData, setFormData] = useState({ image: null, details: '', location: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [generatedReportId, setGeneratedReportId] = useState('');
  const [loadingStage, setLoadingStage] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async = true;
    script.onload = () => window.emailjs.init('MJzgZh1FY-5o66gnS');
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width, height = img.height;
          if (width > 800) { height = (height * 800) / width; width = 800; }
          else if (height > 800) { width = (width * 800) / height; height = 800; }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      const compressed = await compressImage(file);
      setCompressedImage(compressed);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setFormData({ ...formData, location: { lat: pos.coords.latitude, lng: pos.coords.longitude }}),
        () => alert('Unable to get location'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const checkReportStatus = () => {
    if (!trackingId || trackingId.length < 8) {
      alert('⚠️ Please enter a valid Report ID');
      return;
    }
    const storedReports = JSON.parse(localStorage.getItem('garbageReports') || '{}');
    const reportData = storedReports[trackingId];
    if (!reportData) {
      alert('❌ Invalid Report ID!');
      setTrackingStatus(null);
      return;
    }
    const elapsed = (Date.now() - reportData.timestamp) / 1000;
    setTrackingStatus([
      { step: 1, reached: true },
      { step: 2, reached: elapsed >= 5 },
      { step: 3, reached: elapsed >= 10 },
      { step: 4, reached: reportData.verified || false }
    ]);
  };

  const handleSubmit = async () => {
    if (!formData.image || !formData.location) {
      alert('⚠️ Please capture photo and share location');
      return;
    }
    setIsSubmitting(true);
    setStep('loading');
    setTimeout(() => setLoadingStage(1), 0);
    setTimeout(() => setLoadingStage(2), 5000);
    setTimeout(() => setLoadingStage(3), 8000);

    try {
      const reportId = `GR-${Date.now().toString().slice(-8)}`;
      const storedReports = JSON.parse(localStorage.getItem('garbageReports') || '{}');
      storedReports[reportId] = { timestamp: Date.now(), location: formData.location, details: formData.details, verified: false };
      localStorage.setItem('garbageReports', JSON.stringify(storedReports));
      setGeneratedReportId(reportId);

      await window.emailjs.send('service_d8u7ayd', 'template_qsgyy3e', {
        report_id: reportId,
        timestamp: new Date().toLocaleString(),
        latitude: formData.location.lat.toFixed(6),
        longitude: formData.location.lng.toFixed(6),
        google_maps_link: `https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`,
        details: formData.details || 'No details',
        image_data: compressedImage,
        verify_link: `${window.location.origin}/verify.html?id=${reportId}`
      });

      setTimeout(() => { setStep('success'); setIsSubmitting(false); }, 1000);
    } catch (error) {
      alert('Failed to submit. Please try again.');
      setStep('form');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-t-3xl shadow-xl p-6 mt-8 border-b-4 border-green-500">
          <div className="flex items-center justify-center mb-3">
            <div className="bg-green-500 p-3 rounded-full">
              <span className="text-3xl">🎓</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-green-600 text-center">NITP Clean Campus</h1>
          <p className="text-sm text-gray-600 text-center mt-2">Keeping NIT Patna Clean</p>
        </div>

        {step === 'welcome' && (
          <div className="bg-white shadow-xl p-8 rounded-b-3xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🌱</div>
              <h2 className="text-2xl font-bold text-green-800 mb-3">Welcome, Campus Hero!</h2>
              <p className="text-gray-700">Report cleanliness issues on campus</p>
            </div>
            <button onClick={() => setStep('form')} className="w-full bg-green-600 text-white font-bold py-4 rounded-full mb-3">
              📝 Report Issue
            </button>
            <button onClick={() => setStep('track')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-full">
              🔍 Track Report
            </button>
          </div>
        )}

        {step === 'form' && (
          <div className="bg-white shadow-xl p-6 rounded-b-3xl space-y-6">
            <div>
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageCapture} className="hidden" />
              {!imagePreview ? (
                <button onClick={() => fileInputRef.current.click()} className="w-full border-2 border-dashed p-10 rounded-2xl">
                  <Upload className="w-16 h-16 mx-auto text-gray-400" />
                  <p>Tap to Capture Photo</p>
                </button>
              ) : (
                <div className="relative">
                  <img src={imagePreview} alt="Issue" className="w-full h-72 object-cover rounded-2xl" />
                  <button onClick={() => { setImagePreview(null); setFormData({ ...formData, image: null }); }} className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2">✕</button>
                </div>
              )}
            </div>
            <textarea value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} placeholder="Details (optional)" className="w-full border-2 p-4 rounded-xl" rows="3" />
            {!formData.location ? (
              <button onClick={handleGetLocation} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl">📍 Share Location</button>
            ) : (
              <div className="bg-green-50 border-2 border-green-300 p-4 rounded-xl">
                <p className="font-bold text-green-800">✓ Location Captured</p>
              </div>
            )}
            <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl">
              <Send className="inline w-5 h-5 mr-2" />Submit Report
            </button>
          </div>
        )}

        {step === 'loading' && (
          <div className="bg-white shadow-xl p-8 rounded-b-3xl text-center">
            {loadingStage < 3 ? (
              <>
                <div className="w-24 h-24 mx-auto border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xl font-bold">
                  {loadingStage === 1 && '🔍 Searching nearby Cleaning Warriors...'}
                  {loadingStage === 2 && '📡 Fetching cleaning staff...'}
                </p>
              </>
            ) : (
              <div className="space-y-6">
                <div className="w-32 h-32 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-20 h-20 text-white" />
                </div>
                <div className="w-40 h-40 mx-auto rounded-full border-4 border-green-500 bg-gray-200 flex items-center justify-center text-6xl">🧹</div>
                <div>
                  <h3 className="text-2xl font-bold text-green-800">Mr. Deepu Kumar</h3>
                  <p className="text-gray-700 mt-2">🚛 Our cleaning team is heading to your location!</p>
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mt-4">
                    <p className="text-sm font-semibold">⏱️ Arrival: 5-10 minutes</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white shadow-xl p-8 rounded-b-3xl text-center">
            <CheckCircle className="w-24 h-24 text-green-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Report Submitted!</h2>
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-4">
              <p className="text-xl font-bold text-green-800">🌿 Thank You! 🌿</p>
              <p className="text-sm mt-2">Your contribution keeps NITP clean!</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p><strong>Report ID:</strong> {generatedReportId}</p>
              <p className="text-xs mt-2">Sent to NITP Cleaning Committee</p>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4">
              <p className="font-bold">⚠️ Save your Report ID!</p>
            </div>
            <button onClick={() => { setStep('welcome'); setImagePreview(null); setFormData({ image: null, details: '', location: null }); }} className="bg-blue-600 text-white font-bold py-4 px-8 rounded-full">
              📸 Report Another Issue
            </button>
          </div>
        )}

        {step === 'track' && (
          <div className="bg-white shadow-xl p-6 rounded-b-3xl">
            <h2 className="text-2xl font-bold text-center mb-4">Track Your Report</h2>
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
              placeholder="GR-12345678"
              className="w-full border-2 p-4 rounded-xl text-center font-mono mb-4"
            />
            <button onClick={checkReportStatus} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mb-6">
              🔍 Check Status
            </button>
            {trackingStatus && (
              <div className="space-y-4">
                {[
                  { icon: '📨', title: 'Report Received' },
                  { icon: '👀', title: 'Under Review' },
                  { icon: '🚛', title: 'Cleanup Dispatched' },
                  { icon: '✨', title: 'Mission Complete' }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${trackingStatus[i].reached ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className={`font-bold ${trackingStatus[i].reached ? 'text-green-700' : 'text-gray-400'}`}>{item.title}</p>
                        {trackingStatus[i].reached && <p className="text-xs text-green-600">✓ Completed</p>}
                      </div>
                    </div>
                    {i < 3 && (
                      <div className="ml-8 h-12 w-2 rounded-full bg-gray-300 relative">
                        {trackingStatus[i].reached && trackingStatus[i+1].reached && (
                          <div className="absolute inset-0 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setStep('welcome'); setTrackingId(''); setTrackingStatus(null); }} className="w-full bg-gray-200 py-3 rounded-xl mt-6">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
