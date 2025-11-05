<?php

namespace AltDesign\AltAi\Services;

class FieldUpdateParser
{
    /**
     * Parse field updates from AI response
     *
     * @param string $aiMessage
     * @param string $mode
     * @return array|null
     */
    public function parse(string $aiMessage, string $mode): ?array
    {
        if ($mode !== 'update_fields') {
            return null;
        }

        try {
            $jsonStr = $aiMessage;

            // Remove markdown code blocks if present
            if (preg_match('/```json\s*(\{.*?\})\s*```/s', $jsonStr, $matches)) {
                $jsonStr = $matches[1];
            } elseif (preg_match('/```\s*(\{.*?\})\s*```/s', $jsonStr, $matches)) {
                $jsonStr = $matches[1];
            }

            $parsedData = json_decode($jsonStr, true);

            if ($parsedData && isset($parsedData['action']) && $parsedData['action'] === 'update_fields') {
                return $parsedData;
            }
        } catch (\Exception $e) {
            // Silent failure - field updates are optional
        }

        return null;
    }
}
