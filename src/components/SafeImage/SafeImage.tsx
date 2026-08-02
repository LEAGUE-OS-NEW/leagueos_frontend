import {
    type CSSProperties,
    type ImgHTMLAttributes,
    type ReactNode,
    useState,
} from "react";

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
    src?: string | null;
    fallback: ReactNode;
    fallbackClassName?: string;
};

const fallbackStyle: CSSProperties = {
    alignItems: "center",
    display: "inline-flex",
    justifyContent: "center",
    textAlign: "center",
};

function SafeImage({
    src,
    fallback,
    fallbackClassName,
    className,
    alt = "",
    onError,
    ...imageProps
}: SafeImageProps) {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
        return (
            <span
                aria-hidden={imageProps["aria-hidden"]}
                className={fallbackClassName ?? className}
                style={fallbackStyle}
            >
                {fallback}
            </span>
        );
    }

    return (
        <img
            {...imageProps}
            alt={alt}
            className={className}
            src={src}
            onError={(event) => {
                setHasError(true);
                onError?.(event);
            }}
        />
    );
}

export default SafeImage;
