
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAllContent = () => {
  return useQuery({
    queryKey: ['all-content'],
    staleTime: 10 * 1000, // 10 seconds for more real-time updates
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      console.log('Fetching all content...');

      // First, get all upload_content entries ordered by updated_at then created_at (newest first)
      const { data: uploadContent, error: uploadError } = await supabase
        .from('upload_content')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (uploadError) throw uploadError;

      const movies: any[] = [];
      const webSeries: any[] = [];

      // Process each upload_content entry (only Movies and Web Series)
      for (const content of uploadContent || []) {
        if (content.content_type === 'Movie') {
          // Fetch movie details
          const { data: movieData, error: movieError } = await supabase
            .from('movie')
            .select('*')
            .eq('content_id', content.content_id)
            .single();

          if (!movieError && movieData) {
            movies.push({
              ...content,
              movie: movieData
            });
          }
        } else if (content.content_type === 'Web Series') {
          // Fetch web series details
          const { data: webSeriesData, error: webSeriesError } = await supabase
            .from('web_series')
            .select('*')
            .eq('content_id', content.content_id)
            .single();

          if (!webSeriesError && webSeriesData) {
            // Fetch seasons for this web series
            const seasons: any[] = [];
            if (webSeriesData.season_id_list && webSeriesData.season_id_list.length > 0) {
              for (const seasonId of webSeriesData.season_id_list) {
                const { data: seasonData, error: seasonError } = await supabase
                  .from('season')
                  .select('*')
                  .eq('season_id', seasonId)
                  .single();

                if (!seasonError && seasonData) {
                  // Fetch episodes for this season
                  const episodes: any[] = [];
                  if (seasonData.episode_id_list && seasonData.episode_id_list.length > 0) {
                    for (const episodeId of seasonData.episode_id_list) {
                      const { data: episodeData, error: episodeError } = await supabase
                        .from('episode')
                        .select('*')
                        .eq('episode_id', episodeId)
                        .single();

                      if (!episodeError && episodeData) {
                        episodes.push(episodeData);
                      }
                    }
                  }
                  seasons.push({
                    ...seasonData,
                    episodes
                  });
                }
              }
            }

            webSeries.push({
              ...content,
              web_series: {
                ...webSeriesData,
                seasons
              }
            });
          }
        }
      }

      console.log('Fetched content:', { movies, webSeries });

      return {
        movies,
        webSeries
      };
    },
  });
};

export const useContentByFeature = (feature: string) => {
  return useQuery({
    queryKey: ['content-by-feature', feature],
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      console.log('Fetching content by feature:', feature);

      if (!feature) {
        return [];
      }

      try {
        // Get all upload_content entries
        const { data: uploadContent, error: uploadError } = await supabase
          .from('upload_content')
          .select('*');

        if (uploadError) {
          console.error('Error fetching upload content:', uploadError);
          throw uploadError;
        }

        const filteredContent: any[] = [];

        // Process each upload_content entry
        for (const content of uploadContent || []) {
          if (content.content_type === 'Movie') {
            // Fetch movie details
            const { data: movieData, error: movieError } = await supabase
              .from('movie')
              .select('*')
              .eq('content_id', content.content_id)
              .single();

            if (!movieError && movieData && movieData.feature_in?.includes(feature)) {
              filteredContent.push({
                ...content,
                movie: movieData
              });
            }
          } else if (content.content_type === 'Web Series') {
            // Fetch web series details
            const { data: webSeriesData, error: webSeriesError } = await supabase
              .from('web_series')
              .select('*')
              .eq('content_id', content.content_id)
              .single();

            if (!webSeriesError && webSeriesData) {
              // Fetch seasons and check if any season has the feature
              const seasons: any[] = [];
              let hasFeature = false;
              
              if (webSeriesData.season_id_list && webSeriesData.season_id_list.length > 0) {
                for (const seasonId of webSeriesData.season_id_list) {
                  const { data: seasonData, error: seasonError } = await supabase
                    .from('season')
                    .select('*')
                    .eq('season_id', seasonId)
                    .single();

                  if (!seasonError && seasonData) {
                    seasons.push(seasonData);
                    if (seasonData.feature_in?.includes(feature)) {
                      hasFeature = true;
                    }
                  }
                }
              }

              if (hasFeature) {
                filteredContent.push({
                  ...content,
                  web_series: {
                    ...webSeriesData,
                    seasons
                  }
                });
              }
            }
          }
        }

        return filteredContent;
      } catch (error) {
        console.error('Error in useContentByFeature:', error);
        throw error;
      }
    },
    enabled: !!feature,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

export const useContentByGenre = (genre: string) => {
  return useQuery({
    queryKey: ['content-by-genre', genre],
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      console.log('Fetching content by genre:', genre);

      if (!genre) {
        return [];
      }

      try {
        // Handle Action & Adventure special case
        const genresToCheck = genre === 'Action & Adventure' 
          ? ['Action', 'Adventure'] 
          : [genre];

        // Start from upload_content table and filter by genre first
        const { data: uploadContent, error: uploadError } = await supabase
          .from('upload_content')
          .select('*');

        if (uploadError) {
          console.error('Error fetching upload content:', uploadError);
          throw uploadError;
        }

        const filteredContent: any[] = [];

        // Filter upload_content by genre first, then follow foreign keys
        const genreFilteredContent = uploadContent?.filter(content => 
          content.genre && content.genre.some((g: string) => genresToCheck.includes(g))
        ) || [];

        console.log(`Upload content filtered by genre "${genre}":`, genreFilteredContent);

        // Now process each filtered content entry and fetch related data
        for (const content of genreFilteredContent) {
          if (content.content_type === 'Movie') {
            // Fetch movie details using content_id foreign key
            const { data: movieData, error: movieError } = await supabase
              .from('movie')
              .select('*')
              .eq('content_id', content.content_id)
              .single();

            if (!movieError && movieData) {
              filteredContent.push({
                ...content,
                movie: movieData
              });
            }
          } else if (content.content_type === 'Web Series') {
            // Fetch web series details using content_id foreign key
            const { data: webSeriesData, error: webSeriesError } = await supabase
              .from('web_series')
              .select('*')
              .eq('content_id', content.content_id)
              .single();

            if (!webSeriesError && webSeriesData) {
              // Fetch seasons using season_id_list foreign keys
              const seasons: any[] = [];
              
              if (webSeriesData.season_id_list && webSeriesData.season_id_list.length > 0) {
                for (const seasonId of webSeriesData.season_id_list) {
                  const { data: seasonData, error: seasonError } = await supabase
                    .from('season')
                    .select('*')
                    .eq('season_id', seasonId)
                    .single();

                  if (!seasonError && seasonData) {
                    // Fetch episodes using episode_id_list foreign keys
                    const episodes: any[] = [];
                    if (seasonData.episode_id_list && seasonData.episode_id_list.length > 0) {
                      for (const episodeId of seasonData.episode_id_list) {
                        const { data: episodeData, error: episodeError } = await supabase
                          .from('episode')
                          .select('*')
                          .eq('episode_id', episodeId)
                          .single();

                        if (!episodeError && episodeData) {
                          episodes.push(episodeData);
                        }
                      }
                    }
                    seasons.push({
                      ...seasonData,
                      episodes
                    });
                  }
                }
              }

              filteredContent.push({
                ...content,
                web_series: {
                  ...webSeriesData,
                  seasons
                }
              });
            }
          }
        }

        console.log(`Final filtered content for genre "${genre}":`, filteredContent);
        return filteredContent;
      } catch (error) {
        console.error('Error in useContentByGenre:', error);
        throw error;
      }
    },
    enabled: !!genre,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};
