<?php

namespace AltDesign\AltAi\Services;

class DataConverter
{
    /**
     * Convert various data types to string representation
     *
     * @param mixed $value
     * @return string
     */
    public function toString($value): string
    {
        if (is_string($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (string) $value;
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_null($value)) {
            return '';
        }

        if (is_array($value)) {
            // Handle empty arrays
            if (empty($value)) {
                return '';
            }

            // If it's a simple array of scalars, join them
            $allScalar = true;
            foreach ($value as $item) {
                if (!is_scalar($item)) {
                    $allScalar = false;
                    break;
                }
            }

            if ($allScalar) {
                return implode(', ', $value);
            }

            // For complex arrays, return JSON representation
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        if (is_object($value)) {
            // Try to convert object to string
            if (method_exists($value, '__toString')) {
                return (string) $value;
            }

            // Return JSON representation of object
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        // Fallback for any other type
        return (string) $value;
    }
}
