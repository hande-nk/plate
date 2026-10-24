"use client";

import { useEffect, useState } from "react";
import { getPhoto } from "@/lib/photos";

//show a plate photo from the user's phone storage 
export function PlatePhoto({ photoKey }: { photoKey: string }) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;
        getPhoto(photoKey).then((blob) => {
            if(!blob || cancelled) return;
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
        });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl); //free memory
        };
    }, [photoKey]);

    if (!url) return null;
    return (
        <img src={url} alt="" style={{ display: "black", width: "100%", aspectRatio: "4 / 3", objectFit: "cover"}} />
    );
}