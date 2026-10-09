import { Router } from 'express';

const router = Router();

const cache = new Map();

router.get('/location', async (req, res) => {
  try {
    const query = req.query.q as string;
    const rideType = req.query.rideType as string;

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const cacheKey = `${query}-${rideType}`;
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }

    // Using Photon (Komoot) for much faster autocomplete than Nominatim
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=20.5937&lon=78.9629&limit=20`,
      {
        headers: {
          'User-Agent': 'RideBookingApp/1.0'
        }
      }
    );

    let data = { features: [] };
    if (response.ok) {
      data = await response.json();
    }

    const results = data.features
      .filter((item: any) => {
        const props = item.properties;
        
        // Filter out non-India results if any slipped through
        if (props.countrycode && props.countrycode.toUpperCase() !== 'IN') return false;

        const type = props.type;
        const osm_value = props.osm_value;
        const name = props.name?.toLowerCase() || '';
        
        // Filter out fake/small airports like "Seoni Airport"
        if (name.includes('seoni airport')) return false;

        const allowedAddressTypes = [
          'city', 'town', 'village', 'municipality', 'suburb', 'neighbourhood', 
          'hamlet', 'locality', 'aeroway', 'aerodrome', 'station', 'bus_station', 
          'airport', 'train_station', 'state_district', 'district', 'county',
          'state', 'administrative', 'region', 'island', 'archipelago',
          'amenity', 'building', 'highway', 'tourism', 'historic', 'leisure'
        ];

        if (allowedAddressTypes.includes(osm_value) || allowedAddressTypes.includes(type)) return true;
        
        // Also allow if it's explicitly named as an airport, railway station or bus station
        if (name.includes('airport') || name.includes('railway station') || name.includes('bus station') || name.includes('bus stand')) {
          return true;
        }
        
        return false;
      })
      .slice(0, 10)
      .map((item: any) => {
        const props = item.properties;
        
        // Format the name appropriately
        const name = props.name || "";
        const city = props.city || props.town || props.village || props.municipality || "";
        const district = props.district || props.county || props.state_district || "";
        const state = props.state || "";
        const country = props.country || "India";

        // Build hierarchy: City -> District -> State -> India
        const hierarchyParts = [...new Set([district, state, country].filter(Boolean))];
        const secondaryText = hierarchyParts.join(' > ');
        
        const displayNameParts = [...new Set([name, district, state].filter(Boolean))];

        return {
          name: name,
          city: city,
          district: district,
          state: state,
          country: country,
          lat: parseFloat(item.geometry.coordinates[1]),
          lng: parseFloat(item.geometry.coordinates[0]),
          displayName: displayNameParts.join(', '),
          primaryText: name || city || state,
          secondaryText: secondaryText,
          addresstype: props.osm_value || props.type
        };
      });

    // Remove duplicates by displayName, preferring cities over districts
    const resultsMap = new Map();
    for (const item of results) {
      const existing = resultsMap.get(item.displayName);
      const isImportant = item.city === item.name || item.primaryText === item.city || item.addresstype === 'city' || item.addresstype === 'town' || item.addresstype === 'state';
      
      if (!existing) {
        resultsMap.set(item.displayName, item);
      } else {
        // If existing is not a city but the new one is, replace it
        const existingIsImportant = existing.city === existing.name || existing.primaryText === existing.city || existing.addresstype === 'city' || existing.addresstype === 'town' || existing.addresstype === 'state';
        if (!existingIsImportant && isImportant) {
          resultsMap.set(item.displayName, item);
        }
      }
    }
    
    const uniqueResults = Array.from(resultsMap.values());

    // Prioritize cities and towns over districts/states in the final list
    uniqueResults.sort((a: any, b: any) => {
      const aIsImportant = a.city === a.name || a.primaryText === a.city || a.addresstype === 'city' || a.addresstype === 'town' || a.addresstype === 'state';
      const bIsImportant = b.city === b.name || b.primaryText === b.city || b.addresstype === 'city' || b.addresstype === 'town' || b.addresstype === 'state';
      if (aIsImportant && !bIsImportant) return -1;
      if (!aIsImportant && bIsImportant) return 1;
      return 0;
    });

    cache.set(cacheKey, uniqueResults);
    res.json(uniqueResults);

  } catch (error) {
    console.error('Failed to fetch locations:', error);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

export default router;
