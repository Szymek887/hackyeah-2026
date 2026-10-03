package com.telecrazy.hackyeah2026backend.ai;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ClassificationController {

    private final RequestClassificationService classificationService;
    private final TranscriptFormattingService formattingService;

    public ClassificationController(
            RequestClassificationService classificationService,
            TranscriptFormattingService formattingService
    ) {
        this.classificationService = classificationService;
        this.formattingService = formattingService;
    }

    /**
     * Previews the AI classification of a request without saving it (live preview in the request form).
     */
    @PostMapping("/api/requests/classify")
    public RequestClassification classify(@Valid @RequestBody ClassificationInput input) {
        return classificationService.classify(input);
    }

    /**
     * Rewrites a dictated request (speech-to-text) into a title and description for the request form.
     * Nothing is saved; the person reviews the text before submitting.
     */
    @PostMapping("/api/requests/format-transcript")
    public FormattedRequest formatTranscript(@Valid @RequestBody TranscriptInput input) {
        return formattingService.format(input);
    }
}
