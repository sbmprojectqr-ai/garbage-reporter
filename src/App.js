import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, CheckCircle, Upload, ExternalLink, Leaf, TreeDeciduous } from 'lucide-react';

export default function GarbageReportApp() {
  const [step, setStep] = useState('welcome');
  const [imagePreview, setImagePreview] = useState(null);
  const [compressedImage, setCompressedImage] = useState(null);
  const [formData, setFormData] = useState({
    image: null,
    details: '',
    location: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async = true;
    script.onload = () => {
      window.emailjs.init('MJzgZh1FY-5o66gnS');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const compressImage = (file, maxSizeKB = 40) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const maxDimension = 800;
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.7;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          while (compressedDataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          console.log(`Image compressed to ~${(compressedDataUrl.length / 1024).toFixed(2)}KB at quality ${quality.toFixed(2)}`);
          resolve(compressedDataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleOpenReport = () => {
    setStep('form');
  };

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      const compressed = await compressImage(file, 40);
      setCompressedImage(compressed);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (error) => {
          console.error('Location error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            alert('Location permission denied. Please enable location access in your browser settings.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            alert('Location information is unavailable. Please try again.');
          } else if (error.code === error.TIMEOUT) {
            alert('Location request timed out. Please try again.');
          } else {
            alert('Unable to get location. Please enable location services and try again.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser. Please use a modern browser.');
    }
  };

  const openInGoogleMaps = () => {
    if (formData.location) {
      const { lat, lng } = formData.location;
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  };

  const handleSubmit = async () => {
    if (!formData.image) {
      alert('⚠️ Please capture a photo of the garbage before submitting.');
      return;
    }
    
    if (!formData.location) {
      alert('⚠️ Please share your location before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!window.emailjs) {
        throw new Error('EmailJS library not loaded. Please refresh the page and try again.');
      }

      const reportId = `GR-${Date.now().toString().slice(-8)}`;
      const timestamp = new Date().toLocaleString();
      
      const templateParams = {
        report_id: reportId,
        timestamp: timestamp,
        latitude: formData.location.lat.toFixed(6),
        longitude: formData.location.lng.toFixed(6),
        google_maps_link: `https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`,
        details: formData.details || 'No additional details provided',
        image_data: compressedImage,
        name: 'Citizen Report'
      };

      console.log('Sending email...');
      console.log('Image size:', (compressedImage.length / 1024).toFixed(2), 'KB');

      const response = await window.emailjs.send(
        'service_d8u7ayd',
        'template_qsgyy3e',
        templateParams
      );

      console.log('Email sent successfully:', response);
      alert('✅ Report submitted successfully!');
      setStep('success');
    } catch (error) {
      console.error('Detailed error:', error);
      
      let errorMessage = '❌ Failed to submit report.\n\n';
      
      if (error.text) {
        errorMessage += 'Error: ' + error.text + '\n\n';
      } else if (error.message) {
        errorMessage += 'Error: ' + error.message + '\n\n';
      }
      
      errorMessage += 'Please check:\n';
      errorMessage += '• Internet connection\n';
      errorMessage += '• Try again in a moment\n';
      errorMessage += '• Contact support if issue persists';
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('welcome');
    setImagePreview(null);
    setCompressedImage(null);
    setFormData({
      image: null,
      details: '',
      location: null
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <TreeDeciduous className="absolute top-10 left-5 w-24 h-24 text-green-200 opacity-20" />
        <TreeDeciduous className="absolute top-40 right-10 w-32 h-32 text-emerald-200 opacity-15" />
        <Leaf className="absolute bottom-20 left-20 w-20 h-20 text-green-300 opacity-25" />
        <TreeDeciduous className="absolute bottom-40 right-5 w-28 h-28 text-teal-200 opacity-20" />
        <Leaf className="absolute top-60 right-40 w-16 h-16 text-emerald-300 opacity-20 transform rotate-45" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-200 rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-200 rounded-full blur-3xl opacity-10"></div>
      </div>

      <div className="max-w-md mx-auto relative z-10 p-4">
        {/* Header with Earth Icon */}
        <div className="bg-white/95 backdrop-blur-sm rounded-t-3xl shadow-xl p-6 mt-8 border-b-4 border-green-500">
          <div className="flex items-center justify-center mb-3">
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-full shadow-lg">
              <span className="text-3xl">🌍</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 text-center">
            Clean City Reporter
          </h1>
          <p className="text-sm text-gray-600 text-center mt-2 flex items-center justify-center gap-1">
            <Leaf className="w-4 h-4 text-green-500" />
            Keep our environment clean & green
            <Leaf className="w-4 h-4 text-green-500" />
          </p>
        </div>

        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="bg-white/95 backdrop-blur-sm shadow-xl p-8 rounded-b-3xl">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-full bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4">🌱</div>
                <h2 className="text-2xl font-bold text-green-800 mb-3">
                  Welcome, Environmental Hero!
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Thank you for taking the initiative to keep our environment clean and beautiful. 
                  Your small action creates a big impact for our community.
                </p>
              </div>
              
              <button
                onClick={handleOpenReport}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-5 px-12 rounded-full shadow-xl transition-all transform hover:scale-105 hover:shadow-2xl text-lg"
              >
                <span className="flex items-center gap-3">
                  📝 Open Report Form
                </span>
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4">
                <p className="text-sm text-blue-800 text-center leading-relaxed">
                  💡 <strong>Quick Tip:</strong> Take a clear photo, add location, and submit. 
                  The Municipal Corporation will be notified immediately!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Step */}
        {step === 'form' && (
          <div className="bg-white/95 backdrop-blur-sm shadow-xl p-6 rounded-b-3xl">
            <div className="space-y-6">
              {/* Image Capture */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Camera className="w-5 h-5 text-blue-600" />
                  </div>
                  <span>Capture Photo of Garbage *</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleImageCapture}
                  className="hidden"
                />
                {!imagePreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="w-full border-3 border-dashed border-gray-300 rounded-2xl p-10 hover:border-green-500 hover:bg-green-50 transition-all bg-gradient-to-br from-gray-50 to-white"
                  >
                    <Upload className="w-16 h-16 mx-auto text-gray-400 mb-3" />
                    <p className="text-base font-semibold text-gray-700">Tap to Open Camera</p>
                    <p className="text-xs text-gray-500 mt-2">Take a clear photo of the waste</p>
                  </button>
                ) : (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Garbage"
                      className="w-full h-72 object-cover rounded-2xl shadow-lg border-4 border-green-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setCompressedImage(null);
                        setFormData({ ...formData, image: null });
                      }}
                      className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2.5 hover:bg-red-600 shadow-lg transition-all hover:scale-110"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-3 left-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Photo Captured & Compressed
                    </div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <span className="text-lg">📝</span>
                  </div>
                  <span>Additional Details (Optional)</span>
                </label>
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder="Describe the issue in detail...&#10;&#10;Examples:&#10;• Overflowing garbage bin&#10;• Scattered plastic waste&#10;• Broken glass on road&#10;• Medical waste"
                  className="w-full border-2 border-gray-300 rounded-2xl p-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all shadow-sm"
                  rows="5"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <span>Location Information *</span>
                </label>
                {!formData.location ? (
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3"
                  >
                    <div className="bg-white/20 p-2 rounded-full">
                      📍
                    </div>
                    <span>Share My Current Location</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-4 shadow-md">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="bg-green-500 p-2 rounded-full h-fit">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                              Location Captured Successfully
                              <CheckCircle className="w-4 h-4" />
                            </p>
                            <p className="text-xs text-green-700 font-mono mt-1 bg-white/50 px-2 py-1 rounded">
                              {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openInGoogleMaps}
                      className="w-full bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <span className="text-xl">🗺️</span>
                      View Location in Google Maps
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-5 rounded-2xl shadow-xl transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-3 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending Report...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    Submit Report to Municipality
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="bg-white/95 backdrop-blur-sm shadow-xl p-8 rounded-b-3xl">
            <div className="text-center space-y-5">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle className="w-20 h-20 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Report Submitted!</h2>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 space-y-3">
                <p className="text-xl font-bold text-green-800 flex items-center justify-center gap-2">
                  <span className="text-2xl">🌿</span>
                  Thank You for Keeping Our Environment Clean!
                  <span className="text-2xl">🌿</span>
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Your contribution makes a real difference in creating a cleaner, greener future for everyone.
                </p>
              </div>
              <div className="bg-white border-2 border-green-200 rounded-2xl p-5 w-full space-y-2">
                <p className="text-sm font-bold text-gray-800 flex items-center justify-center gap-2">
                  <span className="text-xl">📋</span>
                  Report Details
                </p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-sm text-gray-700">
                    <strong>Report ID:</strong> GR-{Date.now().toString().slice(-8)}
                  </p>
                  <p className="text-xs text-gray-600">
                    <strong>Sent to:</strong> Municipal Corporation
                  </p>
                  <p className="text-xs text-gray-600">
                    <strong>Time:</strong> {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={handleReset}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  📸 Report Another Issue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div className="max-w-md mx-auto mt-8 mb-6 text-center relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-green-200">
          <p className="text-sm text-gray-700 font-semibold flex items-center justify-center gap-2">
            <Leaf className="w-4 h-4 text-green-600" />
            Together for a Cleaner Tomorrow
            <Leaf className="w-4 h-4 text-green-600" />
          </p>
          <p className="text-xs text-gray-500 mt-2">Reports sent directly to Municipal Corporation</p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 font-medium">Developed by Anurag Kumar</p>
            <p className="text-xs text-gray-500 mt-1">Contributors: Shloka Reddy, Varsha Sinha</p>
          </div>
        </div>
      </div>
    </div>
  );
}
