import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSlider from "@/components/HeroSlider";
import HorizontalSection from "@/components/HorizontalSection";
import {
  useAllContent,
  useContentByFeature,
  useContentByGenre,
} from "@/hooks/useContentQueries";

const WebSeries = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const { data: allContent, isLoading: allContentLoading } = useAllContent();
  const { data: heroContent } = useContentByFeature("Type Hero");
  const { data: newReleases } = useContentByFeature("Type New Release");
  const { data: popular } = useContentByFeature("Type Popular");
  const { data: actionContent } = useContentByGenre("Action & Adventure");
  const { data: comedyContent } = useContentByGenre("Comedy");
  const { data: crimeContent } = useContentByGenre("Crime");
  const { data: dramaContent } = useContentByGenre("Drama");
  const { data: horrorContent } = useContentByGenre("Horror");
  const { data: familyContent } = useContentByGenre("Family");
  const { data: thrillerContent } = useContentByGenre("Thriller");
  const { data: sciFiContent } = useContentByGenre("Sci-Fi");

  if (allContentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading web series...</div>
      </div>
    );
  }

  const webSeries = allContent?.webSeries || [];

  // Filter web series for hero content (top 5 newest web series sorted by created_at)
  const heroWebSeries =
    webSeries
      ?.filter((content) => content.content_type === "Web Series")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5)
      .map((content) => ({
        id: content.id,
        title: content.title,
        description:
          content.web_series?.seasons?.[0]?.season_description ||
          content.web_series?.description ||
          content.description,
        rating: content.web_series?.seasons?.[0]?.rating_type || "TV-MA",
        year:
          content.web_series?.seasons?.[0]?.release_year?.toString() ||
          content.created_at?.split("-")[0],
        score: content.web_series?.seasons?.[0]?.rating?.toString() || "8.0",
        image: content.web_series?.seasons?.[0]?.thumbnail_url || "",
        videoUrl: content.web_series?.seasons?.[0]?.episodes?.[0]?.video_url,
        seasonNumber: 1,
        type: "series",
      })) || [];

  // Filter web series for sections
  const getWebSeriesFromContent = (genreContent: any[] | undefined) => {
    if (!genreContent) return [];

    return (
      genreContent
        .filter((content) => content.content_type === "Web Series")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((content) => ({
          id: content.content_id || content.id,
          title: content.title,
          rating: content.web_series?.seasons?.[0]?.rating_type || "TV-MA",
          score: content.web_series?.seasons?.[0]?.rating?.toString() || "8.0",
          image: content.web_series?.seasons?.[0]?.thumbnail_url || "",
          year:
            content.web_series?.seasons?.[0]?.release_year?.toString() ||
            content.created_at?.split("-")[0],
          description:
            content.web_series?.seasons?.[0]?.season_description ||
            content.web_series?.description ||
            content.description,
          type: "webseries",
          seasonNumber: 1,
        })) || []
    );
  };

  // Filter web series by feature (check seasons for feature_in)
  const getWebSeriesByFeature = (featureType: string) => {
    const filteredSeries =
      webSeries?.filter((content) => {
        return (
          content.content_type === "Web Series" &&
          content.web_series?.seasons?.some((season) =>
            season.feature_in?.includes(featureType),
          )
        );
      }) || [];

    // Create a card for each season that has the feature
    const seasonCards = [];
    filteredSeries.forEach((content) => {
      if (
        content.web_series?.seasons &&
        content.web_series.seasons.length > 0
      ) {
        content.web_series.seasons.forEach((season: any, index: number) => {
          if (season.feature_in?.includes(featureType)) {
            seasonCards.push({
              id: `${content.id}-season-${index + 1}`,
              title: content.title,
              rating: season.rating_type || "TV-MA",
              score: season.rating?.toString() || "8.0",
              image: season.thumbnail_url || "",
              year:
                season.release_year?.toString() ||
                content.created_at?.split("-")[0],
              description:
                season.season_description ||
                content.web_series?.description ||
                content.description,
              type: "series",
              seasonNumber: index + 1,
              originalContentId: content.id,
            });
          }
        });
      }
    });

    return seasonCards;
  };

  const sections = [
    {
      title: "New Release",
      contents: getWebSeriesByFeature("Type New Release"),
    },
    { title: "Popular", contents: getWebSeriesByFeature("Type Popular") },
    {
      title: "Action & Adventure",
      contents: getWebSeriesFromContent(actionContent),
    },
    { title: "Comedy", contents: getWebSeriesFromContent(comedyContent) },
    { title: "Crime", contents: getWebSeriesFromContent(crimeContent) },
    { title: "Drama", contents: getWebSeriesFromContent(dramaContent) },
    { title: "Horror", contents: getWebSeriesFromContent(horrorContent) },
    { title: "Family", contents: getWebSeriesFromContent(familyContent) },
    { title: "Thriller", contents: getWebSeriesFromContent(thrillerContent) },
    { title: "Sci-Fi", contents: getWebSeriesFromContent(sciFiContent) },
  ];

  const handleSeeMore = (title: string, contents: any[]) => {
    navigate("/see-more", { state: { title, contents } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSlider contents={heroWebSeries} />

      <div className="container mx-auto px-6 py-4 space-y-4">
        {sections.map((section) => (
          <HorizontalSection
            key={section.title}
            title={section.title}
            contents={section.contents}
            onSeeMore={() => handleSeeMore(section.title, section.contents)}
          />
        ))}
      </div>
    </div>
  );
};

export default WebSeries;
