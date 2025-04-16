// src/pages/Search.js
import React, { useState, useRef, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import ApiClient from "../services/apiClient";
import "./Search.css";

// No API keys needed - they're managed by the backend

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
];

const defaultCenter = { lat: 40.742, lng: -74.179 };

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  flex: 1,
  display: "flex",
};

const Search = () => {
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "",
    bedrooms: "",
    bathrooms: "",
  });

  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(15);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mapRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setProperties([]);

    try {
      // Use our API client to search for properties
      const searchResponse = await ApiClient.searchProperties(formData);
      
      if (searchResponse.status !== 'success') {
        throw new Error(searchResponse.message || "Error searching properties");
      }
      
      const data = searchResponse.data;

      // Process properties and get street view images from our backend
      const updatedProperties = await Promise.all(
        data.map(async (property) => {
          if (property.latitude && property.longitude) {
            try {
              // Use our API Client to get street view URL
              const streetViewResponse = await ApiClient.getStreetViewUrl(
                property.latitude,
                property.longitude,
                "600x300",
                90
              );
              
              if (streetViewResponse.status === 'success') {
                return { 
                  ...property, 
                  streetViewUrl: streetViewResponse.data.url 
                };
              }
              return property;
            } catch (err) {
              console.error("Error getting street view:", err);
              return property;
            }
          }
          return property;
        })
      );

      setProperties(updatedProperties);

      // If we have properties, update the map center based on the first one
      if (updatedProperties.length > 0) {
        setMapCenter({
          lat: updatedProperties[0].latitude,
          lng: updatedProperties[0].longitude,
        });
        setMapZoom(17);
      }
    } catch (err) {
      setError(err.message || "An error occurred while searching for properties");
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyClick = (property) => {
    if (mapRef.current && property.latitude && property.longitude) {
      const newZoom = Math.min(mapZoom + (mapZoom * 0.7), 20);
  
      setMapCenter({ lat: property.latitude, lng: property.longitude });
      setMapZoom(newZoom);

      mapRef.current.panTo({ lat: property.latitude, lng: property.longitude });
      mapRef.current.setZoom(newZoom);
    }
  };
  
  // When an address is entered, we can geocode it to set the map center
  const geocodeAddress = async () => {
    if (formData.address && formData.city && formData.state) {
      try {
        const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
        const geocodeResponse = await ApiClient.geocodeAddress(fullAddress);
        
        if (geocodeResponse.status === 'success' && 
            geocodeResponse.data.results && 
            geocodeResponse.data.results.length > 0) {
          
          const { lat, lng } = geocodeResponse.data.results[0].geometry.location;
          setMapCenter({ lat, lng });
          
          if (mapRef.current) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(15);
          }
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    }
  };

  // When address fields change, try to geocode the address
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address && formData.city && formData.state) {
        geocodeAddress();
      }
    }, 1000); // Debounce the geocoding
    
    return () => clearTimeout(timer);
  }, [formData.address, formData.city, formData.state, formData.zipCode]);

  return (
    <div className="search-page">
      <div className="search-container">
        <h1>Real Estate Search</h1>
        <form onSubmit={handleSubmit} className="search-form">
          {Object.keys(formData).map((field) => (
            <input
              key={field}
              type={field.includes("bed") || field.includes("bath") ? "number" : "text"}
              name={field}
              placeholder={field.replace(/([A-Z])/g, " $1").trim()}
              value={formData[field]}
              onChange={handleChange}
            />
          ))}
          <button type="submit">Search</button>
        </form>

        <div className="property-list">
          {loading && <p className="loading">Loading properties...</p>}
          {error && <p className="error">{error}</p>}
          {properties.length > 0 ? (
            properties.map((property, index) => (
              <div key={index} className="property-card" onClick={() => handlePropertyClick(property)}>
                <div className="property-info">
                  <h2>{property.formattedAddress}</h2>
                  <p><strong>Type:</strong> {property.propertyType}</p>
                  <p><strong>Bedrooms:</strong> {property.bedrooms} | <strong>Bathrooms:</strong> {property.bathrooms}</p>
                  <p><strong>Size:</strong> {property.squareFootage} sq. ft.</p>
                </div>
                <div className="property-image-container">
                  {property.streetViewUrl ? (
                    <img src={property.streetViewUrl} alt="Street View" className="property-image" />
                  ) : (
                    <img src="https://via.placeholder.com/200x150?text=No+Street+View" alt="No Street View" className="property-image" />
                  )}
                </div>
              </div>
            ))
          ) : (
            !loading && <p className="no-results">No properties found.</p>
          )}
        </div>
      </div>

      <div className="map-container">
        <LoadScript googleMapsApiKey="">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            options={{ styles: darkMapStyle }}
            onLoad={(map) => (mapRef.current = map)} 
          >
            {properties.map((property, index) =>
              property.latitude && property.longitude ? (
                <Marker 
                  key={index}
                  position={{ lat: property.latitude, lng: property.longitude }} 
                  title={property.formattedAddress} 
                />
              ) : null
            )}
          </GoogleMap>
        </LoadScript>
      </div>
    </div>
  );
};

export default Search;