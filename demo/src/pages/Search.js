import React, { useState, useRef } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import "./Search.css";

const REAL_ESTATE_API_KEY = process.env.REACT_APP_REALESTATE_API_KEY;
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

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

    const baseUrl = "https://api.rentcast.io/v1/properties";
    const queryParams = new URLSearchParams();

    Object.entries(formData).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    try {
      const response = await fetch(`${baseUrl}?${queryParams.toString()}`, {
        headers: {
          "X-Api-Key": REAL_ESTATE_API_KEY,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const updatedProperties = await Promise.all(
        data.map(async (property) => {
          if (property.latitude && property.longitude) {
            const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${property.latitude},${property.longitude}&fov=90&key=${GOOGLE_API_KEY}`;
            return { ...property, streetViewUrl };
          }
          return property;
        })
      );

      setProperties(updatedProperties);

      if (updatedProperties.length > 0) {
        setMapCenter({
          lat: updatedProperties[0].latitude,
          lng: updatedProperties[0].longitude,
        });
        setMapZoom(17);
      }
    } catch (err) {
      setError(err.message);
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
        <LoadScript googleMapsApiKey={GOOGLE_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            options={{ styles: darkMapStyle }}
            onLoad={(map) => (mapRef.current = map)} 
          >
            {properties.map((property, index) =>
              property.latitude && property.longitude ? (
                <Marker key={index} position={{ lat: property.latitude, lng: property.longitude }} title={property.formattedAddress} />
              ) : null
            )}
          </GoogleMap>
        </LoadScript>
      </div>
    </div>
  );
};

export default Search;
