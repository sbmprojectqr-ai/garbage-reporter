import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, CheckCircle, Upload, ExternalLink, Leaf, TreeDeciduous } from 'lucide-react';

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
  const [verifyReportId, setVerifyReportId] = useState('');
  const fileInputRef = useRef(null);

  const staffPhotoUrl = "https://i.ibb.co/3yZtM1m/Deepu-Kumar.jpg";

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verifyId = urlParams.get('id');
    if (verifyId) {
      setVerifyReportId(verifyId);
      setStep('verify');
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async = true;
    script.onload = () => window.emailjs.init('MJzgZh1FY-5o66gnS');
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const compressImage = (file, maxSizeKB = 40) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width, height = img.height;
          const maxDimension = 800;
          if (width > height && width > maxDimension) { height = (height * maxDimension) / width; width = maxDimension; }
          else if (height > maxDimension) { width = (width * maxDimension) / height; height = maxDimension; }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          let quality = 0.7;
          let result = canvas.toDataURL('image/jpeg', quality);
          while (result.length > maxSizeKB * 1024 && quality > 0.1) { quality -= 0.1; result = canvas.toDataURL('image/jpeg', quality); }
          resolve(result);
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
      const compressed = await compressImage(file, 40);
      setCompressedImage(compressed);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setFormData({ ...formData, location: { lat: position.coords.latitude, lng: position.coords.longitude } }),
        () => alert('Unable to get location. Please enable location services.'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else { alert('Geolocation is not supported.'); }
  };

  const openInGoogleMaps = () => {
    if (formData.location) window.open(`https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`, '_blank');
  };

  const checkReportStatus = () => {
    if (!trackingId || trackingId.length < 8) { alert('Please enter a valid Report ID'); return; }
    const storedReports = JSON.parse(localStorage.getItem('garbageReports') || '{}');
    const reportData = storedReports[trackingId];
    if (!reportData) { alert('Invalid Report ID!'); setTrackingStatus(null); return; }
    const elapsed = (Date.now() - reportData.timestamp) / 1000;
    setTrackingStatus([
      { step: 1, reached: true },
      { step: 2, reached: elapsed >= 5 },
      { step: 3, reached: elapsed >= 10 },
      { step: 4, reached: reportData.verified || false }
    ]);
  };

  const handleSubmit = async () => {
    if (!formData.image) { alert('Please capture a photo.'); return; }
    if (!formData.location) { alert('Please share your location.'); return; }
    setIsSubmitting(true); setStep('loading');
    setTimeout(() => setLoadingStage(1), 0);
    setTimeout(() => setLoadingStage(2), 5000);
    setTimeout(() => setLoadingStage(3), 8000);

    try {
      if (!window.emailjs) throw new Error('EmailJS not loaded');
      const reportId = `GR-${Date.now().toString().slice(-8)}`;
      const storedReports = JSON.parse(localStorage.getItem('garbageReports') || '{}');
      storedReports[reportId] = { timestamp: Date.now(), location: formData.location, details: formData.details, verified: false };
      localStorage.setItem('garbageReports', JSON.stringify(storedReports));
      setGeneratedReportId(reportId);

      await new Promise(resolve => setTimeout(resolve, 3000));
      await window.emailjs.send('service_d8u7ayd', 'template_qsgyy3e', {
        report_id: reportId,
        timestamp: new Date().toLocaleString(),
        latitude: formData.location.lat.toFixed(6),
        longitude: formData.location.lng.toFixed(6),
        google_maps_link: `https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`,
        details: formData.details || 'No details',
        image_data: compressedImage,
        verify_link: `${window.location.origin}${window.location.pathname}?id=${reportId}`
      });
    } catch (error) {
      console.error(error);
      alert('Failed to submit. Please try again.');
      setStep('form'); setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('welcome'); setImagePreview(null); setCompressedImage(null);
    setFormData({ image: null, details: '', location: null }); setLoadingStage(0);
  };

  const handleVerifyYes = () => {
    const storedReports = JSON.parse(localStorage.getItem('garbageReports') || '{}');
    if (storedReports[verifyReportId]) {
      storedReports[verifyReportId].verified = true;
      storedReports[verifyReportId].verifiedAt = Date.now();
      localStorage.setItem('garbageReports', JSON.stringify(storedReports));
      setStep('verifySuccess');
    } else { alert('Invalid Report ID!'); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <TreeDeciduous className="absolute top-10 left-5 w-24 h-24 text-green-200 opacity-20" />
        <TreeDeciduous className="absolute top-40 right-10 w-32 h-32 text-emerald-200 opacity-15" />
        <Leaf className="absolute bottom-20 left-20 w-20 h-20 text-green-300 opacity-25" />
      </div>

      <div className="max-w-md mx-auto relative z-10 p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-t-3xl shadow-xl p-6 mt-8 border-b-4 border-green-500">
          <div className="flex items-center justify-center mb-3">
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-full shadow-lg">
              <span className="text-3xl">🎓</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 text-center">NITP Clean Campus</h1>
          <p className="text-sm text-gray-600 text-center mt-2 flex items-center justify-center gap-1">
            <Leaf className="w-4 h-4 text-green-500" />Keep our environment clean<Leaf className="w-4 h-4 text-green-500" />
          </p>
        </div>

        {step === 'welcome' && (
          <div className="bg-white/95 shadow-xl p-8 rounded-b-3xl">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-full bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4">🌱</div>
                <h2 className="text-2xl font-bold text-green-800 mb-3">Welcome, Environmental Hero!</h2>
                <p className="text-gray-700">Thank you for keeping our NITP campus clean and beautiful.</p>
              </div>
              <button onClick={() => setStep('form')} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-5 rounded-full shadow-xl text-lg">📝 Open Report Form</button>
              <button onClick={() => setStep('track')} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 rounded-full shadow-xl text-lg">🔍 Track Report Status</button>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-sm text-blue-800 text-center">💡 Take a clear photo, add location, and submit. Save your Report ID!</p>
              </div>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="bg-white/95 shadow-xl p-6 rounded-b-3xl">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg"><Camera className="w-5 h-5 text-blue-600" /></div>
                  <span>Capture Photo *</span>
                </label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageCapture} className="hidden" />
                {!imagePreview ? (
                  <button onClick={() => fileInputRef.current.click()} className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-10 hover:border-green-500">
                    <Upload className="w-16 h-16 mx-auto text-gray-400 mb-3" />
                    <p className="font-semibold text-gray-700">Tap to Open Camera</p>
                  </button>
                ) : (
                  <div className="relative">
                    <img src={imagePreview} alt="Captured" className="w-full h-72 object-cover rounded-2xl border-4 border-green-100" />
                    <button onClick={() => { setImagePreview(null); setCompressedImage(null); setFormData({ ...formData, image: null }); }} className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2">✕</button>
                    <div className="absolute bottom-3 left-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Photo Captured</div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-purple-100 p-2 rounded-lg"><span className="text-lg">📝</span></div>
                  <span>Details (Optional)</span>
                </label>
                <textarea value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} placeholder="Describe the issue..." className="w-full border-2 border-gray-300 rounded-2xl p-4" rows="4" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-red-100 p-2 rounded-lg"><MapPin className="w-5 h-5 text-red-600" /></div>
                  <span>Location *</span>
                </label>
                {!formData.location ? (
                  <button onClick={handleGetLocation} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3">
                    <span>📍</span>Share My Location
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4">
                      <div className="flex gap-3">
                        <div className="bg-green-500 p-2 rounded-full"><MapPin className="w-5 h-5 text-white" /></div>
                        <div>
                          <p className="text-sm font-bold text-green-800 flex items-center gap-2">Location Captured<CheckCircle className="w-4 h-4" /></p>
                          <p className="text-xs text-green-700 font-mono">{formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={openInGoogleMaps} className="w-full bg-white border-2 border-gray-300 py-3 rounded-xl flex items-center justify-center gap-2">
                      🗺️ View in Google Maps<ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-lg">
                <Send className="w-6 h-6" />Submit to NITP Committee
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="bg-white/95 shadow-xl p-8 rounded-b-3xl text-center">
            {loadingStage < 3 ? (
              <div>
                <div className="w-24 h-24 mx-auto border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
                <p className="text-xl font-bold">{loadingStage === 1 ? '🔍 Searching nearby Cleaning Warriors...' : '📡 Fetching cleaning staff...'}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-28 h-28 mx-auto bg-green-500 rounded-full flex items-center justify-center"><CheckCircle className="w-16 h-16 text-white" /></div>
                <div className="w-36 h-36 mx-auto rounded-full overflow-hidden border-4 border-green-500 shadow-xl">
                  <img src={staffPhotoUrl} alt="Mr. Deepu Kumar" className="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-800">Mr. Deepu Kumar</h3>
                  <p className="text-gray-700 mt-2">🚛 Our cleaning warrior is heading to your location with his team!</p>
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mt-4">
                    <p className="text-sm font-semibold text-green-800">⏱️ Arrival: 5-10 minutes</p>
                  </div>
                </div>
                <button onClick={() => setStep('success')} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl">Continue →</button>
              </div>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white/95 shadow-xl p-8 rounded-b-3xl text-center space-y-5">
            <div className="w-28 h-28 mx-auto bg-green-100 rounded-full flex items-center justify-center"><CheckCircle className="w-16 h-16 text-green-600" /></div>
            <h2 className="text-3xl font-bold text-gray-800">Report Submitted!</h2>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-400">
                  <img src={staffPhotoUrl} alt="Mr. Deepu Kumar" className="w-full h-full object-cover object-top" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-blue-800">Mr. Deepu Kumar</p>
                  <p className="text-xs text-blue-700">Cleaning Team Leader</p>
                </div>
              </div>
              <p className="text-sm text-blue-800">🚛 Team heading to your location!</p>
              <p className="text-xs text-blue-700">⏱️ Arriving in 5-10 minutes</p>
            </div>
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4">
              <p className="text-lg font-bold text-green-800">🌿 Thank You! 🌿</p>
            </div>
            <div className="bg-white border-2 border-green-200 rounded-2xl p-4">
              <p className="text-sm font-bold mb-2">📋 Report Details</p>
              <p className="text-sm"><strong>ID:</strong> {generatedReportId}</p>
              <p className="text-xs text-gray-600">Sent to: NITP Cleaning Committee</p>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-4">
              <p className="text-sm font-bold text-yellow-800">⚠️ Save your Report ID!</p>
            </div>
            <button onClick={handleReset} className="bg-blue-600 text-white font-bold py-4 px-8 rounded-full">📸 Report Another</button>
          </div>
        )}

        {step === 'track' && (
          <div className="bg-white/95 shadow-xl p-6 rounded-b-3xl">
            <h2 className="text-2xl font-bold text-center mb-4">Track Report</h2>
            <input type="text" value={trackingId} onChange={(e) => setTrackingId(e.target.value.toUpperCase())} placeholder="GR-12345678" className="w-full border-2 p-4 rounded-xl text-center font-mono mb-4" />
            <button onClick={checkReportStatus} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mb-6">🔍 Check Status</button>
            {trackingStatus && (
              <div className="space-y-3">
                {[{ icon: '📨', title: 'Report Received' }, { icon: '👀', title: 'Under Review' }, { icon: '🚛', title: 'Cleanup Dispatched' }, { icon: '✨', title: 'Mission Complete' }].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl ${trackingStatus[i].reached ? 'bg-green-500' : 'bg-gray-300'}`}>{item.icon}</div>
                      <div>
                        <p className={`font-bold ${trackingStatus[i].reached ? 'text-green-700' : 'text-gray-400'}`}>{item.title}</p>
                        {trackingStatus[i].reached && <p className="text-xs text-green-600">✓ Done</p>}
                      </div>
                    </div>
                    {i < 3 && <div className={`ml-7 h-8 w-1 rounded-full ${trackingStatus[i].reached && trackingStatus[i + 1].reached ? 'bg-green-500' : 'bg-gray-300'}`}></div>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setStep('welcome'); setTrackingId(''); setTrackingStatus(null); }} className="w-full bg-gray-200 py-3 rounded-xl mt-6">← Back</button>
          </div>
        )}

        {step === 'verify' && (
          <div className="bg-white/95 shadow-xl p-6 rounded-b-3xl text-center space-y-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-4xl">🧹</div>
            <h2 className="text-2xl font-bold">Cleanup Verification</h2>
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4">
              <p className="text-sm font-bold">Report ID:</p>
              <p className="text-xl font-mono font-bold text-green-800">{verifyReportId}</p>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-yellow-900 mb-4">⚠️ Verification Required</h3>
              <p className="text-yellow-800 mb-6">Has the cleanup been completed?</p>
              <div className="flex gap-4 justify-center">
                <button onClick={handleVerifyYes} className="bg-green-600 text-white font-bold py-4 px-6 rounded-xl">✅ Yes</button>
                <button onClick={() => alert('Please complete cleanup first.')} className="bg-red-500 text-white font-bold py-4 px-6 rounded-xl">❌ No</button>
              </div>
            </div>
          </div>
        )}

        {step === 'verifySuccess' && (
          <div className="bg-white/95 shadow-xl p-8 rounded-b-3xl text-center">
            <div className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-16 h-16 text-white" /></div>
            <h2 className="text-3xl font-bold text-green-800 mb-4">Thank You!</h2>
            <p className="text-gray-700 mb-4">Cleanup verified for Report <strong>{verifyReportId}</strong></p>
            <button onClick={() => { setStep('welcome'); setVerifyReportId(''); window.history.replaceState({}, '', window.location.pathname); }} className="bg-blue-600 text-white font-bold py-4 px-8 rounded-full">Go Home</button>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto mt-8 mb-6 text-center">
        <div className="bg-white/80 rounded-2xl shadow-lg p-4 border border-green-200">
          <p className="text-sm text-gray-700 font-semibold flex items-center justify-center gap-2">
            <Leaf className="w-4 h-4 text-green-600" />Together for a Cleaner Tomorrow<Leaf className="w-4 h-4 text-green-600" />
          </p>
          <p className="text-xs text-gray-500 mt-2">NITP Cleaning Committee</p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 font-medium">Developed by Anurag Kumar</p>
            <p className="text-xs text-gray-500 mt-1">Contributors: Shloka Reddy, Varsha Sinha</p>
          </div>
        </div>
      </div>
    </div>
  );
}
