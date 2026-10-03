package com.telecrazy.hackyeah2026backend.ai;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ClassificationController {

    private final RequestClassificationService classificationService;

    public ClassificationController(RequestClassificationService classificationService) {
        this.classificationService = classificationService;
    }

    /**
     * Previews the AI classification of a request without saving it (live preview in the request form).
     */
    @PostMapping("/api/requests/classify")
    public RequestClassification classify(@Valid @RequestBody ClassificationInput input) {
        return classificationService.classify(input);
    }
}
