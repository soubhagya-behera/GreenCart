package com.example.greencart.controller;

import com.example.greencart.entity.Recipe;
import com.example.greencart.entity.RecipeIngredient;
import com.example.greencart.entity.User;
import com.example.greencart.repository.RecipeRepository;
import com.example.greencart.util.AccessGuard;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;

import java.util.List;
import java.util.Map;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeRepository recipeRepo;

    private final ObjectMapper objectMapper;

    // Recipe management is restricted to sellers and admins, matching the
    // existing "Manage Recipes" feature in both portals. Viewing stays public.
    private User requireRecipeManager(HttpServletRequest request) {

        User user = (User) request.getAttribute("user");

        if (user == null) {
            throw new UnauthorizedException();
        }

        AccessGuard.require(
                AccessGuard.hasAnyRole(user, "seller", "admin"),
                "Only sellers or admins can manage recipes"
        );

        return user;
    }

    // Server-generated filename: client-supplied names never reach disk,
    // so path traversal is impossible; the extension is whitelist-validated.
    private String sanitizedImageName(MultipartFile file) {

        String original = file.getOriginalFilename();

        int dot = original != null ? original.lastIndexOf('.') : -1;

        if (dot < 0 || dot == original.length() - 1) {
            throw new RuntimeException(
                    "Image file must have an extension");
        }

        String ext = original.substring(dot).toLowerCase();

        if (!ext.matches("\\.(png|jpg|jpeg|webp|gif)")) {
            throw new RuntimeException(
                    "Only PNG, JPG, WEBP or GIF images are allowed");
        }

        return "recipe_" + System.currentTimeMillis() + ext;
    }

    // GET ALL RECIPES
    @GetMapping
    public Map<String, List<Recipe>> listRecipes() {

        List<Recipe> recipes =
                recipeRepo
                .findByActiveTrueOrderByCreatedAtDesc();

        return Map.of(
                "recipes",
                recipes
        );
    }

    // GET SINGLE RECIPE
    @GetMapping("/{id}")
    public Map<String, Recipe> getRecipe(
            @PathVariable Long id
    ) {

        Recipe recipe =
                recipeRepo.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Recipe not found"
                                )
                        );

        return Map.of(
                "recipe",
                recipe
        );
    }

    // CREATE RECIPE
    @PostMapping(
            consumes = "multipart/form-data"
    )
    public Recipe createRecipe(

            HttpServletRequest request,

            @RequestParam String name,

            @RequestParam Integer serves,

            @RequestParam String ingredients,

            @RequestParam(required = false)
            String instructions,

            @RequestParam(required = false)
            String prepTime,

            @RequestParam(required = false)
            String cookTime,

            @RequestParam(required = false)
            MultipartFile file

    ) throws Exception {

        requireRecipeManager(request);

        Recipe recipe = new Recipe();

        recipe.setName(name);

        recipe.setServes(serves);

        recipe.setInstructions(instructions);

        recipe.setPrepTime(prepTime);

        recipe.setCookTime(cookTime);

        recipe.setActive(true);

        // PARSE INGREDIENTS JSON
        List<RecipeIngredient> parsedIngredients =
                objectMapper.readValue(
                        ingredients,
                        new TypeReference<
                                List<RecipeIngredient>>() {}
                );

        recipe.setIngredients(
                parsedIngredients
        );

        // IMAGE UPLOAD
        if (file != null && !file.isEmpty()) {

    String filename = sanitizedImageName(file);

File uploadDir =
        new File(
                System.getProperty("user.dir"),
                "uploads"
        );

    if (!uploadDir.exists()) {

        uploadDir.mkdirs();
    }

    File dest =
            new File(
                    uploadDir,
                    filename
            );

    file.transferTo(dest);

    System.out.println(
            "Saved file at: "
            + dest.getAbsolutePath()
    );

    recipe.setImageUrl(
            "/uploads/" + filename
    );
}
        return recipeRepo.save(recipe);
    }

    // UPDATE RECIPE
    @PutMapping(
            value = "/{id}",
            consumes = "multipart/form-data"
    )
    public Recipe updateRecipe(

            HttpServletRequest request,

            @PathVariable Long id,

            @RequestParam String name,

            @RequestParam Integer serves,

            @RequestParam String ingredients,

            @RequestParam(required = false)
            String instructions,

            @RequestParam(required = false)
            String prepTime,

            @RequestParam(required = false)
            String cookTime,

            @RequestParam(required = false)
            Boolean active,

            @RequestParam(required = false)
            MultipartFile file

    ) throws Exception {

        requireRecipeManager(request);

        Recipe recipe =
                recipeRepo.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Recipe not found"
                                )
                        );

        recipe.setName(name);

        recipe.setServes(serves);

        recipe.setInstructions(instructions);

        recipe.setPrepTime(prepTime);

        recipe.setCookTime(cookTime);

        if (active != null) {

            recipe.setActive(active);
        }

        // PARSE INGREDIENTS
        List<RecipeIngredient> parsedIngredients =
                objectMapper.readValue(
                        ingredients,
                        new TypeReference<
                                List<RecipeIngredient>>() {}
                );

        recipe.setIngredients(
                parsedIngredients
        );

        // UPDATE IMAGE
        if (file != null && !file.isEmpty()) {

            String filename = sanitizedImageName(file);

            Path uploadPath =
                    Paths.get("uploads");

            Files.createDirectories(uploadPath);

            Path filePath =
                    uploadPath.resolve(filename);

            file.transferTo(filePath);

            recipe.setImageUrl(
                    "/uploads/" + filename
            );
        }

        return recipeRepo.save(recipe);
    }

    // DELETE RECIPE
    @DeleteMapping("/{id}")
    public Map<String, Boolean> deleteRecipe(
            HttpServletRequest request,
            @PathVariable Long id
    ) {

        requireRecipeManager(request);

        recipeRepo.deleteById(id);

        return Map.of(
                "ok",
                true
        );
    }
}