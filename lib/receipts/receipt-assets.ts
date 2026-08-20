import { supabase } from "@/lib/supabase";

export async function imageUrlToDataUrl(
  url: string
): Promise<string | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        "Could not fetch receipt image:",
        response.status
      );

      return null;
    }

    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        resolve(
          typeof reader.result === "string"
            ? reader.result
            : null
        );
      };

      reader.onerror = () => resolve(null);

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(
      "Image conversion error:",
      error
    );

    return null;
  }
}

export async function getBusinessAssetUrl(
  path: string | null
): Promise<string | null> {
  if (!path) {
    return null;
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  const { data, error } =
    await supabase.storage
      .from("business-assets")
      .createSignedUrl(path, 60 * 10);

  if (error) {
    console.error(
      "Receipt asset signed URL error:",
      error
    );

    return null;
  }

  return data?.signedUrl ?? null;
}

export async function loadReceiptAssets(
  logoUrl: string | null,
  stampUrl: string | null,
  showLogo: boolean,
  showStamp: boolean
) {
  let logoDataUrl: string | null = null;
  let stampDataUrl: string | null = null;

  if (showLogo && logoUrl) {
    const url =
      await getBusinessAssetUrl(logoUrl);

    if (url) {
      logoDataUrl =
        await imageUrlToDataUrl(url);
    }
  }

  if (showStamp && stampUrl) {
    const url =
      await getBusinessAssetUrl(stampUrl);

    if (url) {
      stampDataUrl =
        await imageUrlToDataUrl(url);
    }
  }

  return {
    logoDataUrl,
    stampDataUrl,
  };
}