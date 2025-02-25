import axios from 'axios';
import * as cheerio from 'cheerio';
import xml2js from 'xml2js';
import type { Rating } from '../db/schema';

/**
 * Validates a Letterboxd URL
 * @param url - The URL to validate
 * @returns True if the URL is valid
 */
export function validateLetterboxdUrl(url: string): boolean {
  // Check if the URL is empty
  if (!url || url.trim() === '') {
    return false;
  }

  // Check if the URL matches the Letterboxd pattern
  const letterboxdRegex = /^https?:\/\/(www\.)?letterboxd\.com\/[a-zA-Z0-9_-]+\/?$/;
  return letterboxdRegex.test(url);
}

/**
 * Extracts the username from a Letterboxd URL
 * @param url - The Letterboxd URL
 * @returns The extracted username or null if extraction fails
 */
export function extractLetterboxdUsername(url: string): string | null {
  if (!validateLetterboxdUrl(url)) {
    return null;
  }

  // Extract username from URL
  const match = url.match(/letterboxd\.com\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Fetches Letterboxd user data based on their username
 * @param usernameOrUrl - The Letterboxd username or profile URL
 * @returns Object containing user's Letterboxd data
 */
export async function fetchLetterboxdData(usernameOrUrl: string): Promise<{
  status: 'success' | 'error' | 'not_provided';
  recentRatings?: Rating[];
  favoriteGenres?: string[];
  favoriteFilms?: string[];
  error?: string;
}> {
  console.log('Starting Letterboxd fetch for:', usernameOrUrl);
  
  try {
    // Return early if not provided
    if (!usernameOrUrl || usernameOrUrl.trim() === '') {
      console.log('No Letterboxd URL or username provided');
      return { status: 'not_provided' };
    }

    // Extract username if a URL was provided
    const username = usernameOrUrl.includes('letterboxd.com') 
      ? extractLetterboxdUsername(usernameOrUrl) 
      : usernameOrUrl;

    if (!username) {
      console.error('Invalid Letterboxd URL or username:', usernameOrUrl);
      return {
        status: 'error',
        error: 'Invalid Letterboxd URL or username'
      };
    }

    console.log(`Fetching Letterboxd data for username: ${username}`);

    // Fetch the user's RSS feed
    const rssUrl = `https://letterboxd.com/${username}/rss/`;
    console.log('Fetching RSS from:', rssUrl);
    
    const response = await axios.get(rssUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    
    if (response.status !== 200) {
      console.error(`RSS fetch failed with status: ${response.status}`);
      return {
        status: 'error',
        error: `Failed to fetch Letterboxd data: ${response.statusText}`
      };
    }

    console.log('Successfully fetched RSS data');
    
    // Parse the RSS XML
    const parser = new xml2js.Parser({ explicitArray: false });
    let result;
    
    try {
      result = await parser.parseStringPromise(response.data);
      console.log('Successfully parsed XML data');
    } catch (parseError) {
      console.error('XML parsing failed:', parseError);
      return {
        status: 'error',
        error: 'Failed to parse Letterboxd RSS feed'
      };
    }
    
    if (!result?.rss?.channel) {
      console.error('Invalid RSS structure - missing channel element');
      return {
        status: 'error',
        error: 'Invalid RSS feed format'
      };
    }

    // For genre analysis
    const genreFrequency: {[key: string]: number} = {};

    // Extract ratings from RSS items
    const items = Array.isArray(result.rss.channel.item) 
      ? result.rss.channel.item 
      : result.rss.channel.item ? [result.rss.channel.item] : [];

    console.log(`Found ${items.length} items in RSS feed`);
    
    if (items.length === 0) {
      console.log('No items found in RSS feed - user may not have any ratings');
      return {
        status: 'success',
        recentRatings: [],
        favoriteGenres: [],
        favoriteFilms: []
      };
    }

    // Debug: Check structure of first item to understand the RSS format
    if (items.length > 0) {
      console.log('Examining RSS item structure:', Object.keys(items[0]));
      console.log('Sample item type:', items[0].type || 'no type field');
    }

    const recentRatings: Rating[] = [];
    
    for (const item of items) {
      try {
        // Debug the actual item structure for better understanding
        // Different RSS feeds might have different field names
        const hasRating = item['letterboxd:memberRating'] || 
                        item.letterboxd$memberRating || 
                        (item.category && item.category.includes('review'));
        
        console.log(`Processing item: ${item.title}, hasRating:`, !!hasRating);
        
        // Try multiple approaches to extract rating information
        let title = '';
        let rating = '';
        
        // First approach - using nested property access
        if (item['letterboxd:filmTitle']) {
          title = Array.isArray(item['letterboxd:filmTitle']) 
            ? item['letterboxd:filmTitle'][0] 
            : item['letterboxd:filmTitle'];
          
          if (item['letterboxd:memberRating']) {
            rating = Array.isArray(item['letterboxd:memberRating']) 
              ? item['letterboxd:memberRating'][0] 
              : item['letterboxd:memberRating'];
          }
        } 
        // Second approach - using $ notation
        else if (item.letterboxd$filmTitle) {
          title = item.letterboxd$filmTitle;
          rating = item.letterboxd$memberRating;
        } 
        // Third approach - extract from item title (format: "Film Name - review/watched/rated")
        else if (item.title) {
          const titleParts = item.title.split(' - ');
          if (titleParts.length > 0) {
            title = titleParts[0];
            
            // Try to extract rating from description (common format for some Letterboxd RSS feeds)
            if (item.description && item.description.includes('rated')) {
              const ratingMatch = item.description.match(/rated (\d+(?:\.\d+)?)\/5/);
              if (ratingMatch && ratingMatch[1]) {
                rating = ratingMatch[1];
              }
            }
          }
        }
        
        // If we found a title and rating
        if (title && rating) {
          // Convert Letterboxd's 0-5 scale to 1-10 for consistency
          const numericRating = parseFloat(rating) * 2;
          
          if (!isNaN(numericRating)) {
            console.log(`Found valid rating: ${title} (${numericRating})`);
            
            recentRatings.push({
              title,
              rating: numericRating.toString(),
              url: item.link || ''
            });
          }
        }
        
        // Extract genres if available
        const genres: string[] = [];
        
        if (item['letterboxd:filmGenres']) {
          const genreStr = Array.isArray(item['letterboxd:filmGenres']) 
            ? item['letterboxd:filmGenres'][0] 
            : item['letterboxd:filmGenres'];
            
          if (genreStr) {
            genres.push(...genreStr.split(',').map((g: string) => g.trim()));
          }
        } else if (item.letterboxd$filmGenres) {
          if (item.letterboxd$filmGenres) {
            genres.push(...item.letterboxd$filmGenres.split(',').map((g: string) => g.trim()));
          }
        }
        
        // Add to genre frequency
        genres.forEach((genre: string) => {
          if (genre) {
            genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
          }
        });
      } catch (itemError) {
        console.error('Error processing item:', itemError);
        // Continue processing other items
      }
      
      // Limit to 10 ratings
      if (recentRatings.length >= 10) break;
    }

    console.log(`Processed ${recentRatings.length} valid ratings`);

    // Get favorite films (4.5+ star ratings or top 5 highest rated)
    const favoriteFilms = recentRatings
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 5)
      .map(r => r.title);

    // Determine favorite genres from frequency
    const favoriteGenres = Object.entries(genreFrequency)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5)
      .map(([genre]) => genre);
    
    console.log('Extracted favorite genres:', favoriteGenres);
    console.log('Extracted favorite films:', favoriteFilms);

    // Try fetching additional info from profile page
    try {
      // Always fetch the profile page for additional context
      console.log('Fetching profile page for additional data');
      const profileUrl = `https://letterboxd.com/${username}/`;
      const profileResponse = await axios.get(profileUrl, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(profileResponse.data);
      console.log('Successfully loaded profile page');
      
      // Debug: Log some of the page structure to understand the HTML
      console.log('Page sections found:', {
        favorites: $('.favorites').length,
        favFilms: $('.fav-films').length,
        filmPoster: $('.film-poster').length,
        posterList: $('.poster-list').length,
        h3Count: $('h3').length,
        h2Count: $('h2').length
      });
      
      // Try to log all section headings for debugging
      console.log('Section headings:');
      $('h2, h3, h4').each((i, el) => {
        console.log(`- ${$(el).text().trim()}`);
      });
      
      // Extract bio if available
      const bio = $('.bio-content').text().trim();
      if (bio) {
        console.log('Found bio on profile:', bio);
      }
      
      // Look for favorite films/popular films sections using a variety of selectors
      const hasPopularFilmsSection = $('.popular-films').length > 0;
      const hasFavoriteFilmsSection = $('.favourite-films, .favorites, .fav-films').length > 0;
      
      console.log(`Profile has sections - Popular films: ${hasPopularFilmsSection}, Favorite films: ${hasFavoriteFilmsSection}`);
      
      // If we're going to use the recent ratings method, clear the current favorite films
      // We'll prioritize actual favorites if we can find them
      let foundActualFavorites = false;
      
      // COMPREHENSIVE STRATEGY FOR FINDING FAVORITE FILMS
      // Approach 1: Look for section headings containing "FAVORITE" or "FAVOURITES"
      console.log('Looking for favorite films sections by heading text...');
      $('h2, h3, h4').each((i, heading) => {
        const headingText = $(heading).text().trim();
        if (headingText.toLowerCase().includes('favorite') || 
            headingText.toLowerCase().includes('favourite')) {
          console.log(`Found favorite films heading: "${headingText}"`);
          
          // Try to find posters in the next element or parent container
          const posterContainer = $(heading).next().find('.poster-list, .poster-container, .film-poster');
          if (posterContainer.length > 0) {
            console.log('Found poster container after heading');
            
            // Clear existing favorites since we found actual favorites
            favoriteFilms.splice(0, favoriteFilms.length);
            foundActualFavorites = true;
            
            // Extract film titles from the posters
            posterContainer.find('img').each((j, img) => {
              const filmTitle = $(img).attr('alt')?.trim();
              if (filmTitle && !favoriteFilms.includes(filmTitle)) {
                favoriteFilms.push(filmTitle);
                console.log('Found favorite film by heading:', filmTitle);
              }
            });
          } else {
            // Try to find film posters in the parent container
            const parentContainer = $(heading).parent();
            parentContainer.find('img.poster, .film-poster img').each((j, img) => {
              const filmTitle = $(img).attr('alt')?.trim();
              if (filmTitle && !favoriteFilms.includes(filmTitle)) {
                // Clear existing favorites before adding the first one
                if (!foundActualFavorites) {
                  favoriteFilms.splice(0, favoriteFilms.length);
                  foundActualFavorites = true;
                }
                favoriteFilms.push(filmTitle);
                console.log('Found favorite film by parent container:', filmTitle);
              }
            });
          }
        }
      });
      
      // Approach 2: Look for containers with specific class names
      if (!foundActualFavorites) {
        console.log('Looking for favorite films by container classes...');
        $('.favorite-films, .film-favorites, .favorites, .fav-films, section[data-item-type="FilmPoster"]').each((i, container) => {
          console.log('Found potential favorite films container');
          // Find all posters within the container
          $(container).find('img').each((j, img) => {
            const filmTitle = $(img).attr('alt')?.trim();
            if (filmTitle && !favoriteFilms.includes(filmTitle)) {
              // Clear existing favorites before adding the first one
              if (!foundActualFavorites) {
                favoriteFilms.splice(0, favoriteFilms.length);
                foundActualFavorites = true;
              }
              favoriteFilms.push(filmTitle);
              console.log('Found favorite film by container class:', filmTitle);
            }
          });
        });
      }
      
      // Approach 3: Find sections through general poster lists
      if (!foundActualFavorites) {
        console.log('Scanning all poster sections...');
        $('.poster-list').each((i, list) => {
          // Check if this section might be a favorites section
          const nearestHeading = $(list).prev('h2, h3, h4').text().trim().toLowerCase();
          console.log(`Found poster list with heading: "${nearestHeading}"`);
          
          // If heading contains keywords like favorite, or it's the first poster list
          if (nearestHeading.includes('favorite') || 
              nearestHeading.includes('favourite') || 
              nearestHeading.includes('films') || 
              i === 0) {
            // Find all posters within this list
            $(list).find('img').each((j, img) => {
              const filmTitle = $(img).attr('alt')?.trim();
              if (filmTitle && !favoriteFilms.includes(filmTitle)) {
                // Clear existing favorites before adding the first one
                if (!foundActualFavorites) {
                  favoriteFilms.splice(0, favoriteFilms.length);
                  foundActualFavorites = true;
                }
                favoriteFilms.push(filmTitle);
                console.log('Found favorite film from poster list:', filmTitle);
              }
            });
          }
        });
      }
      
      // Update extraction logic for favorite genres too
      if (favoriteGenres.length === 0) {
        console.log('Extracting genres from profile');
        // Try favorite films section first
        $('.favourite-films .metadata-genres a, .favorites .metadata-genres a').each((_, element) => {
          const genre = $(element).text().trim();
          if (genre && !favoriteGenres.includes(genre)) {
            favoriteGenres.push(genre);
          }
        });
        
        // If still empty, try popular films section
        if (favoriteGenres.length === 0) {
          $('.popular-films .metadata-genres a').each((_, element) => {
            const genre = $(element).text().trim();
            if (genre && !favoriteGenres.includes(genre)) {
              favoriteGenres.push(genre);
            }
          });
        }
        
        // If still empty, look for any genre links in reviews
        if (favoriteGenres.length === 0) {
          $('.film-genres a').each((_, element) => {
            const genre = $(element).text().trim();
            if (genre && !favoriteGenres.includes(genre)) {
              favoriteGenres.push(genre);
            }
          });
        }
      }
      
      // If no favorites found yet, and we have recent ratings, use those as fallback
      if (!foundActualFavorites && favoriteFilms.length === 0 && recentRatings.length > 0) {
        console.log('No favorite films found on profile, using top-rated films as fallback');
        // Get favorite films (4.5+ star ratings or top 5 highest rated)
        favoriteFilms.push(...recentRatings
          .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
          .slice(0, 5)
          .map(r => r.title));
      }
      
      console.log(`After profile scraping: ${favoriteGenres.length} genres, ${favoriteFilms.length} films`);
      if (favoriteFilms.length > 0) {
        console.log('Final favorite films:', favoriteFilms);
      }
      
    } catch (profileError) {
      console.error('Error fetching profile page (continuing with RSS data):', profileError);
      // We'll continue with whatever we got from the RSS feed
    }

    return {
      status: 'success',
      recentRatings,
      favoriteGenres,
      favoriteFilms
    };
  } catch (error) {
    console.error('Error fetching Letterboxd data:', error);
    const errorMessage = error instanceof Error ? 
      error.message : 'Unknown error occurred';
    
    return {
      status: 'error',
      error: errorMessage,
      // Even with error, return empty arrays to avoid null/undefined issues
      recentRatings: [],
      favoriteGenres: [],
      favoriteFilms: []
    };
  }
} 