package com.example.greencart.security;

import com.example.greencart.dto.SellerOrderDTO;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderItem;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SellerOrderDtoTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    private User user(Long id, String name, String email, String role) {
        User u = new User();
        u.setId(id);
        u.setName(name);
        u.setEmail(email);
        u.setRole(role);
        return u;
    }

    private Product product(Long id, User seller, String name) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setImageUrl("/img-" + id + ".png");
        p.setSeller(seller);
        return p;
    }

    private OrderItem item(Product product, int qty, double price) {
        OrderItem i = new OrderItem();
        i.setProduct(product);
        i.setQty(qty);
        i.setPrice(price);
        return i;
    }

    private Order mixedOrder() {
        User sellerA = user(1L, "A", "a@x.com", "seller");
        User sellerB = user(2L, "B", "b@x.com", "seller");
        User customer = user(10L, "Cust", "cust@x.com", "user");
        User partner = user(20L, "Rider", "rider@x.com", "delivery");

        Order o = new Order();
        o.setId(100L);
        o.setUser(customer);
        o.setAddress("12 Green St");
        o.setOrderStatus("Processing");
        o.setPaymentStatus("Paid");
        o.setPaymentMethod("COD");
        o.setOtpVerified(false);
        o.setDeliveryOtp("999999");
        o.setAssignedDelivery(partner);
        o.setItems(List.of(
                item(product(11L, sellerA, "Tomatoes"), 2, 50.0),
                item(product(22L, sellerB, "Rice"), 3, 100.0)
        ));
        return o;
    }

    @Test
    void dtoContainsOnlyRequestingSellersItemsAndSubtotal() {
        User sellerA = user(1L, "A", "a@x.com", "seller");

        SellerOrderDTO dto = SellerOrderDTO.from(mixedOrder(), sellerA);

        assertNotNull(dto);
        assertEquals(1, dto.getItems().size());
        assertEquals(11L, dto.getItems().get(0).getProductId());
        // 2 x 50 only; the rice line (3 x 100) must not be counted
        assertEquals(100.0, dto.getTotal());
        assertEquals("Cust", dto.getUser().getName());
        assertEquals("Rider", dto.getAssignedDelivery().getName());
    }

    @Test
    void otherSellerSeesOnlyTheirOwnLine() {
        User sellerB = user(2L, "B", "b@x.com", "seller");

        SellerOrderDTO dto = SellerOrderDTO.from(mixedOrder(), sellerB);

        assertNotNull(dto);
        assertEquals(1, dto.getItems().size());
        assertEquals(22L, dto.getItems().get(0).getProductId());
        assertEquals(300.0, dto.getTotal());
    }

    @Test
    void ordersWithoutSellersItemsAreExcluded() {
        User outsider = user(3L, "C", "c@x.com", "seller");

        assertNull(SellerOrderDTO.from(mixedOrder(), outsider));
        assertTrue(SellerOrderDTO.fromOrders(List.of(mixedOrder()), outsider).isEmpty());
    }

    @Test
    void serializedDtoLeaksNoForeignItemsSensitiveCodesOrWholeCartTotal()
            throws Exception {
        User sellerA = user(1L, "A", "a@x.com", "seller");

        SellerOrderDTO dto = SellerOrderDTO.from(mixedOrder(), sellerA);

        String json = mapper.writeValueAsString(dto);

        assertFalse(json.contains("Rice"));
        assertFalse(json.contains("deliveryOtp"));
        assertFalse(json.contains("999999"));
        assertFalse(json.contains("razorpayOrderId"));
        assertFalse(json.contains("razorpayPaymentId"));

        // Fields the existing dashboard relies on remain present
        assertTrue(json.contains("\"total\""));
        assertTrue(json.contains("\"items\""));
        assertTrue(json.contains("\"orderStatus\""));
        assertTrue(json.contains("\"paymentStatus\""));
        assertTrue(json.contains("\"otpVerified\""));
        assertTrue(json.contains("\"assignedDelivery\""));

        // Contract aliases for the seller portal
        assertTrue(json.contains("\"orderId\""));
        assertTrue(json.contains("\"sellerSubtotal\""));
        assertEquals(100L, dto.getOrderId());
        assertEquals(100.0, dto.getSellerSubtotal());
    }
}
