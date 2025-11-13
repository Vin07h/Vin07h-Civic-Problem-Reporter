import React, { useEffect, useRef, useState } from 'react';

// --- COLOR MAP CONFIGURATION ---
const COLOR_MAP = {
  pothole: {
    border: '#FF0000', // Red
    background: 'rgba(255, 0, 0, 0.4)',
    text: '#FFFFFF',
  },
  garbage: {
    border: '#007BFF', // Blue
    background: 'rgba(0, 123, 255, 0.4)',
    text: '#FFFFFF',
  },
  default: {
    border: '#808080', // Gray
    background: 'rgba(128, 128, 128, 0.4)',
    text: '#FFFFFF',
  }
};

const DetectionViewer = ({ imageDataUrl, detections = [] }) => {
    const imageRef = useRef(null);
    // State to force re-render when image loads or window resizes
    const [imageLoaded, setImageLoaded] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Handle Window Resize to keep boxes aligned
    useEffect(() => {
        const handleResize = () => {
            if (imageRef.current) {
                setDimensions({
                    width: imageRef.current.clientWidth,
                    height: imageRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const renderBoundingBoxes = () => {
        if (!detections || detections.length === 0 || !imageRef.current) {
            return null;
        }

        const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.current;

        // Prevent division by zero if image hasn't loaded
        if (naturalWidth === 0 || naturalHeight === 0) return null;

        const scaleX = clientWidth / naturalWidth;
        const scaleY = clientHeight / naturalHeight;

        return detections.map((detection, index) => {
            const { x_min, y_min, x_max, y_max, confidence, class_name } = detection;

            // Get the color from the map, or use default
            const lowerCaseClass = class_name ? class_name.toLowerCase() : 'default';
            const color = COLOR_MAP[lowerCaseClass] || COLOR_MAP.default;

            const style = {
                position: 'absolute',
                // FIX: Added backticks for template literals
                left: `${x_min * scaleX}px`,
                top: `${y_min * scaleY}px`,
                width: `${(x_max - x_min) * scaleX}px`,
                height: `${(y_max - y_min) * scaleY}px`,
                
                border: `2px solid ${color.border}`,
                boxSizing: 'border-box',
                color: color.text,
                backgroundColor: color.background,
                
                fontSize: '12px',
                padding: '2px 4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'flex',
                alignItems: 'start', // Aligns text to top of box
                fontWeight: 'bold'
            };

            return (
                <div key={index} style={style}>
                    {/* FIX: Corrected string interpolation for the label */}
                    {`${class_name} ${(confidence * 100).toFixed(0)}%`}
                </div>
            );
        });
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <img
                ref={imageRef}
                src={imageDataUrl}
                alt="Detection preview"
                style={{ width: '100%', display: 'block', borderRadius: '8px' }}
                // IMPORTANT: Ensure boxes calculate only after image has dimensions
                onLoad={() => setImageLoaded(true)}
            />
            {imageLoaded && renderBoundingBoxes()}
        </div>
    );
};

export default DetectionViewer;