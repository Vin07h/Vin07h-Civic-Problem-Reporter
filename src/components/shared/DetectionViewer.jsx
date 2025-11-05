import React, { useEffect, useRef } from 'react';

const DetectionViewer = ({ imageDataUrl, detections = [] }) => {
    const imageRef = useRef(null);

    const renderBoundingBoxes = () => {
        if (!detections || detections.length === 0 || !imageRef.current) {
            return null;
        }

        const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageRef.current;
        const scaleX = clientWidth / naturalWidth;
        const scaleY = clientHeight / naturalHeight;

        return detections.map((detection, index) => {
            const { x_min, y_min, x_max, y_max, confidence } = detection;

            const style = {
                position: 'absolute',
                left: `${x_min * scaleX}px`,
                top: `${y_min * scaleY}px`,
                width: `${(x_max - x_min) * scaleX}px`,
                height: `${(y_max - y_min) * scaleY}px`,
                border: '2px solid #2E8540', // Use secondary color
                boxSizing: 'border-box',
                color: 'white',
                backgroundColor: 'rgba(46, 133, 64, 0.4)',
                fontSize: '12px',
                padding: '2px 4px',
            };

            return (
                <div key={index} style={style}>
                    {`${(confidence * 100).toFixed(0)}%`}
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
            />
            {renderBoundingBoxes()}
        </div>
    );
};

export default DetectionViewer;