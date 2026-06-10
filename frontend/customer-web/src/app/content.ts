import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import { summerBanners, summerNews } from "./contentSeed";

export type PublicBanner = {
  bannerId: number;
  title: string;
  subtitle: string;
  imgUrl: string;
  linkUrl: string;
  position: number;
};

export type PublicNews = {
  newsId: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  image: string;
  date: string;
  sortDate?: string;
  readTime: number;
  body?: string[];
};

type BannerDto = {
  bannerId?: number | null;
  title?: string | null;
  subtitle?: string | null;
  imgUrl?: string | null;
  linkUrl?: string | null;
  position?: number | null;
};

type NewsDto = {
  newsId?: number | null;
  category?: string | null;
  title?: string | null;
  slug?: string | null;
  thumbnail?: string | null;
  summary?: string | null;
  createdAt?: string | null;
};

type ContentState = {
  banners: PublicBanner[];
  news: PublicNews[];
  loading: boolean;
  error: string | null;
};

const emptyState: ContentState = {
  banners: [],
  news: [],
  loading: true,
  error: null,
};

const fallbackSlug = (title: string, id: number) => {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `news-${id}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.split("T")[0] || "";
  return date.toLocaleDateString("vi-VN");
};

const estimateReadTime = (text: string) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
};

const toPublicBanner = (dto: BannerDto): PublicBanner => {
  const bannerId = Number(dto.bannerId || 0);
  return {
    bannerId,
    title: dto.title?.trim() || "CoffeeGo",
    subtitle: dto.subtitle?.trim() || "",
    imgUrl: dto.imgUrl?.trim() || "",
    linkUrl: dto.linkUrl?.trim() || "/",
    position: Number(dto.position || 1),
  };
};

const toPublicNews = (dto: NewsDto): PublicNews => {
  const newsId = Number(dto.newsId || 0);
  const title = dto.title?.trim() || `Tin tuc #${newsId}`;
  const excerpt = dto.summary?.trim() || title;
  const createdAt = dto.createdAt?.trim() || "";
  return {
    newsId,
    slug: dto.slug?.trim() || fallbackSlug(title, newsId),
    title,
    category: dto.category?.trim() || "Tin tuc",
    excerpt,
    image: dto.thumbnail?.trim() || "",
    date: formatDate(createdAt),
    sortDate: createdAt,
    readTime: estimateReadTime(`${title} ${excerpt}`),
    body: excerpt ? [excerpt] : undefined,
  };
};

const sortBanners = (items: PublicBanner[]) =>
  [...items].sort((a, b) => a.position - b.position || a.bannerId - b.bannerId);

const sortNews = (items: PublicNews[]) =>
  [...items].sort((a, b) => {
    const aTime = Date.parse(a.sortDate || "");
    const bTime = Date.parse(b.sortDate || "");
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return b.newsId - a.newsId;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  });

export function usePublicContent(): ContentState {
  const [state, setState] = useState<ContentState>(emptyState);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setState((current) => ({ ...current, loading: true, error: null }));
        const [banners, news] = await Promise.all([
          apiRequest<BannerDto[]>("/content/banners"),
          apiRequest<NewsDto[]>("/content/news"),
        ]);

        if (!active) return;

        setState({
          banners: sortBanners(banners.map(toPublicBanner).filter((banner) => banner.imgUrl)),
          news: sortNews(news.map(toPublicNews)),
          loading: false,
          error: null,
        });
      } catch (err) {
        if (!active) return;
        setState({
          banners: summerBanners,
          news: summerNews,
          loading: false,
          error: null,
        });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return state;
}

export function usePublicNews() {
  const { news, loading, error } = usePublicContent();
  return useMemo(() => ({ news, loading, error }), [error, loading, news]);
}

export function usePublicBanners() {
  const [state, setState] = useState<Pick<ContentState, "banners" | "loading" | "error">>({
    banners: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setState((current) => ({ ...current, loading: true, error: null }));
        const banners = await apiRequest<BannerDto[]>("/content/banners");
        if (!active) return;
        setState({
          banners: sortBanners(banners.map(toPublicBanner).filter((banner) => banner.imgUrl)),
          loading: false,
          error: null,
        });
      } catch (err) {
        if (!active) return;
        setState({
          banners: summerBanners,
          loading: false,
          error: null,
        });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
