package com.example.greencart.security;

import com.example.greencart.controller.RecipeController;
import com.example.greencart.entity.Recipe;
import com.example.greencart.entity.User;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;
import com.example.greencart.repository.RecipeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RecipeControllerSecurityTest {

    private RecipeRepository recipeRepo;
    private RecipeController controller;

    private final User seller = user(1L, "seller");
    private final User admin = user(9L, "admin");
    private final User customer = user(2L, "user");

    // Shared user factory used across this suite
    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        recipeRepo = mock(RecipeRepository.class);
        controller = new RecipeController(recipeRepo, new ObjectMapper());
    }

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    @Test
    void recipeListingAndDetailRemainPublic() {
        Recipe salad = new Recipe();
        salad.setId(1L);
        salad.setName("Salad");

        when(recipeRepo.findByActiveTrueOrderByCreatedAtDesc())
                .thenReturn(List.of(salad));
        when(recipeRepo.findById(1L)).thenReturn(Optional.of(salad));

        Map<String, List<Recipe>> list = controller.listRecipes();
        assertEquals(1, list.get("recipes").size());

        Map<String, Recipe> detail = controller.getRecipe(1L);
        assertEquals("Salad", detail.get("recipe").getName());
    }

    @Test
    void unauthenticatedRecipeMutationIsBlocked() {
        HttpServletRequest anon = requestFor(null);

        assertThrows(UnauthorizedException.class, () -> controller.createRecipe(
                anon, "Hack", 1, "[]", null, null, null, null));
        assertThrows(UnauthorizedException.class, () -> controller.updateRecipe(
                anon, 1L, "Hack", 1, "[]", null, null, null, null, null));
        assertThrows(UnauthorizedException.class,
                () -> controller.deleteRecipe(anon, 1L));
    }

    @Test
    void normalCustomerCannotCreateUpdateOrDeleteRecipes() {
        HttpServletRequest cust = requestFor(customer);

        assertThrows(ForbiddenException.class, () -> controller.createRecipe(
                cust, "Hack", 1, "[]", null, null, null, null));
        assertThrows(ForbiddenException.class, () -> controller.updateRecipe(
                cust, 1L, "Hack", 1, "[]", null, null, null, null, null));
        assertThrows(ForbiddenException.class,
                () -> controller.deleteRecipe(cust, 1L));

        verify(recipeRepo, org.mockito.Mockito.never()).deleteById(any());
    }

    @Test
    void sellerRetainsIntendedRecipeManagementPermission() throws Exception {
        HttpServletRequest sellerReq = requestFor(seller);

        when(recipeRepo.save(any(Recipe.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Recipe created = controller.createRecipe(
                sellerReq, "Veggie Bowl", 2, "[]", null, null, null, null);
        assertEquals("Veggie Bowl", created.getName());

        Recipe existing = new Recipe();
        existing.setId(5L);
        existing.setName("Old");
        when(recipeRepo.findById(5L)).thenReturn(Optional.of(existing));

        Recipe updated = controller.updateRecipe(
                sellerReq, 5L, "Veggie Bowl v2", 4, "[]",
                null, null, null, Boolean.TRUE, null);
        assertEquals("Veggie Bowl v2", updated.getName());
        assertTrue(Boolean.TRUE.equals(updated.getActive()));

        when(recipeRepo.existsById(5L)).thenReturn(true);
        Map<String, Boolean> result = controller.deleteRecipe(sellerReq, 5L);
        assertTrue(result.get("ok"));
        verify(recipeRepo).deleteById(5L);
    }

    @Test
    void adminCanManageAllRecipes() throws Exception {
        HttpServletRequest adminReq = requestFor(admin);

        when(recipeRepo.save(any(Recipe.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        assertNotNull(controller.createRecipe(
                adminReq, "Admin Soup", 4, "[]", null, null, null, null));

        Recipe existing = new Recipe();
        existing.setId(7L);
        when(recipeRepo.findById(7L)).thenReturn(Optional.of(existing));

        Recipe updated = controller.updateRecipe(
                adminReq, 7L, "Admin Soup v2", 2, "[]",
                null, null, null, null, null);
        assertEquals("Admin Soup v2", updated.getName());

        when(recipeRepo.existsById(7L)).thenReturn(true);
        assertTrue(controller.deleteRecipe(adminReq, 7L).get("ok"));
        verify(recipeRepo).deleteById(7L);
    }
}
