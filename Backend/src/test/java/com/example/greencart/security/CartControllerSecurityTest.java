package com.example.greencart.security;

import com.example.greencart.controller.CartController;
import com.example.greencart.dto.AddToCartDTO;
import com.example.greencart.entity.Cart;
import com.example.greencart.entity.CartItem;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;
import com.example.greencart.repository.CartItemRepository;
import com.example.greencart.repository.CartRepository;
import com.example.greencart.repository.ProductRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Removed (soft-deleted) products must be unpurchasable at the cart level,
// not just hidden from the storefront UI.
class CartControllerSecurityTest {

    private CartRepository cartRepo;
    private CartItemRepository itemRepo;
    private ProductRepository productRepo;
    private CartController controller;

    private final User customer = user(1L, "user");

    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        cartRepo = mock(CartRepository.class);
        itemRepo = mock(CartItemRepository.class);
        productRepo = mock(ProductRepository.class);
        controller = new CartController(cartRepo, itemRepo, productRepo);
    }

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    private AddToCartDTO addDto(Long productId, int qty) {
        AddToCartDTO dto = new AddToCartDTO();
        dto.setProductId(productId);
        dto.setQuantity(qty);
        return dto;
    }

    @Test
    void customerCannotAddRemovedProductToCart() {
        Product removed = new Product();
        removed.setId(9L);
        removed.setName("Old Rice");
        removed.setStock(10);
        removed.setActive(false);
        when(productRepo.findById(9L)).thenReturn(Optional.of(removed));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> controller.add(addDto(9L, 2), requestFor(customer)));

        assertTrue(ex.getMessage().contains("no longer available"));
        verify(itemRepo, never()).save(any(CartItem.class));
    }

    @Test
    void customerCannotIncreaseQtyOfRemovedProductAlreadyInCart() {
        Product removed = new Product();
        removed.setId(9L);
        removed.setName("Old Rice");
        removed.setActive(false);
        when(productRepo.findById(9L)).thenReturn(Optional.of(removed));

        Cart cart = new Cart();
        cart.setUser(customer);
        when(cartRepo.findByUser(customer)).thenReturn(Optional.of(cart));

        assertThrows(RuntimeException.class,
                () -> controller.add(addDto(9L, 1), requestFor(customer)));

        verify(itemRepo, never()).save(any(CartItem.class));
    }

    @Test
    void customerCanStillAddActiveProductToCart() {
        Product active = new Product();
        active.setId(10L);
        active.setName("Fresh Rice");
        active.setStock(10);
        active.setActive(true);
        when(productRepo.findById(10L)).thenReturn(Optional.of(active));

        Cart cart = new Cart();
        cart.setUser(customer);
        when(cartRepo.findByUser(customer))
                .thenReturn(Optional.empty(), Optional.of(cart));
        when(cartRepo.save(any(Cart.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(itemRepo.findByCartAndProduct(any(Cart.class), any(Product.class)))
                .thenReturn(Optional.empty());
        when(itemRepo.save(any(CartItem.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CartItem result = controller.add(addDto(10L, 1), requestFor(customer));

        assertEquals(1, result.getQty());
        verify(itemRepo).save(any(CartItem.class));
    }
}
