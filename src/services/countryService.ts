import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Country } from '../types';

let cachedCountries: Country[] | null = null;

export const fetchCountries = async (): Promise<Country[]> => {
  if (cachedCountries) {
    return cachedCountries;
  }

  try {
    const countriesRef = collection(db, 'countries');
    const snapshot = await getDocs(countriesRef);
    const countries: Country[] = [];
    
    snapshot.forEach((doc) => {
      countries.push(doc.data() as Country);
    });
    
    // Sort by ID to maintain the original order
    countries.sort((a, b) => a.id - b.id);
    
    cachedCountries = countries;
    return countries;
  } catch (error) {
    console.error('Error fetching countries from Firestore:', error);
    return [];
  }
};
