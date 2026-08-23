package com.example.greencart.security;

import com.example.greencart.controller.ProductController;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;
import com.example.greencart.repository.ProductRepository;
import com.example.greencart.service.FileUploadService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProductControllerSecurityTest {

    private ProductRepository repo;
    private FileUploadService fileUploadService;
    private SimpMessagingTemplate messagingTemplate;
    private ProductController controller;

    private final User sellerA = user(1L, "seller");
    private final User sellerB = user(2L, "seller");
    private final User customer = user(3L, "user");
    private final User admin = user(9L, "admin");

    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        repo = mock(ProductRepository.class);
        fileUploadService = mock(FileUploadService.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        controller = new ProductController(
                repo,
                fileUploadService,
                messagingTemplate);
    }

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    private Product ownedByB() {
        Product p = new Product();
        p.setId(77L);
        p.setName("Rice");
        p.setSeller(sellerB);
        return p;
    }

    private Product ownedByA() {
        Product p = new Product();
        p.setId(5L);
        p.setName("Wheat");
        p.setSeller(sellerA);
        return p;
    }

    @Test
    void sellerACannotUpdateStockOfSellersBProduct() {
        Product rice = ownedByB();
        when(repo.findById(77L)).thenReturn(java.util.Optional.of(rice));

        assertThrows(ForbiddenException.class, () -> controller.updateStock(
                77L, Map.of("stock", 0), requestFor(sellerA)));
    }

    @Test
    void sellerACannotDeleteSellersBProduct() {
        Product rice = ownedByB();
        when(repo.findById(77L)).thenReturn(java.util.Optional.of(rice));

        assertThrows(ForbiddenException.class, () -> controller.deleteProduct(
                77L, requestFor(sellerA)));
    }

    @Test
    void normalCustomerCannotUpdateOrDeleteProducts() {
        Product rice = ownedByB();
        when(repo.findById(77L)).thenReturn(java.util.Optional.of(rice));

        assertThrows(RuntimeException.class, () -> controller.updateStock(
                77L, Map.of("stock", 0), requestFor(customer)));
        assertThrows(RuntimeException.class, () -> controller.deleteProduct(
                77L, requestFor(customer)));
    }

    @Test
    void ownerCanStillUpdateOwnStock() {
        Product mine = new Product();
        mine.setId(5L);
        mine.setStock(1);
        mine.setSeller(sellerA);
        when(repo.findById(5L)).thenReturn(java.util.Optional.of(mine));
        when(repo.save(any(Product.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Product result = controller.updateStock(
                5L, Map.of("stock", 42), requestFor(sellerA));

        assertEquals(42, result.getStock());
    }

    @Test
    void adminRetainsPlatformWideProductControl() {
        Product rice = ownedByB();
        when(repo.findById(77L)).thenReturn(java.util.Optional.of(rice));
        when(repo.save(any(Product.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        assertEquals(7, controller.updateStock(
                77L, Map.of("stock", 7), requestFor(admin)).getStock());

        Mockito.reset(repo);
        when(repo.findById(77L)).thenReturn(java.util.Optional.of(rice));
        when(repo.save(any(Product.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Admin removal is also a soft deactivation, never a hard delete.
        assertEquals("Product removed from your inventory",
                controller.deleteProduct(77L, requestFor(admin)));
        assertFalse(rice.getActive());
        verify(repo, never()).delete(any(Product.class));
    }

    // ---- SOFT REMOVE (inventory deactivation) ----------------------------

    @Test
    void ownerRemoveDeactivatesWithoutPhysicalDelete() {
        Product mine = ownedByA();
        when(repo.findById(5L)).thenReturn(java.util.Optional.of(mine));
        when(repo.save(any(Product.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        String message = controller.deleteProduct(5L, requestFor(sellerA));

        assertEquals("Product removed from your inventory", message);
        assertEquals(Boolean.FALSE, mine.getActive());
        verify(repo).save(mine);
        verify(repo, never()).delete(any(Product.class));
        verify(repo, never()).deleteById(anyLong());
    }

    @Test
    void removeIsIdempotent_whenAlreadyRemoved() {
        Product mine = ownedByA();
        mine.setActive(false);
        when(repo.findById(5L)).thenReturn(java.util.Optional.of(mine));
        when(repo.save(any(Product.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        String message = controller.deleteProduct(5L, requestFor(sellerA));

        assertEquals("Product removed from your inventory", message);
        assertEquals(Boolean.FALSE, mine.getActive());
        verify(repo, never()).delete(any(Product.class));
    }

    @Test
    void removedProductKeepsOrderAndReviewHistoryIntact() {
        Product mine = ownedByA();
        when(repo.findById(5L)).thenReturn(java.util.Optional.of(mine));
        when(repo.save(any(Product.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        controller.deleteProduct(5L, requestFor(sellerA));

        // The row survives with every field untouched except `active`.
        assertEquals("Wheat", mine.getName());
        assertEquals(sellerA, mine.getSeller());
        verify(repo).save(mine);
    }

    @Test
    void anonymousUserCannotUploadProductImages() {
        MultipartFile file = mock(MultipartFile.class);

        assertThrows(UnauthorizedException.class,
                () -> controller.uploadImage(requestFor(null), file));
    }

    @Test
    void normalCustomerCannotUploadProductImages() {
        MultipartFile file = mock(MultipartFile.class);

        assertThrows(ForbiddenException.class,
                () -> controller.uploadImage(requestFor(customer), file));
    }

    @Test
    void sellerCanStillUploadProductImages() throws Exception {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(fileUploadService.uploadFile(any())).thenReturn("/uploads/x.png");

        var response = controller.uploadImage(requestFor(sellerA), file);

        @SuppressWarnings("unchecked")
        java.util.Map<String, String> body =
                (java.util.Map<String, String>) response.getBody();
        assertEquals("/uploads/x.png", body.get("url"));
        Mockito.verify(fileUploadService).uploadFile(any());
    }
}
