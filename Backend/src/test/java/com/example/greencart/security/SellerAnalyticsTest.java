package com.example.greencart.security;

import com.example.greencart.controller.SellerController;
import com.example.greencart.dto.SellerAnalyticsDTO;
import com.example.greencart.entity.Order;
import com.example.greencart.entity.OrderItem;
import com.example.greencart.entity.Product;
import com.example.greencart.entity.User;

import com.example.greencart.repository.OrderRepository;
import com.example.greencart.repository.ProductRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SellerAnalyticsTest {

    private OrderRepository orderRepo;
    private ProductRepository productRepo;
    private SellerController controller;

    private final User sellerA = user(1L, "seller");
    private final User sellerB = user(2L, "seller");

    static User user(Long id, String role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }

    @BeforeEach
    void setUp() {
        orderRepo = mock(OrderRepository.class);
        productRepo = mock(ProductRepository.class);
        controller = new SellerController(orderRepo, productRepo);
    }

    private HttpServletRequest requestFor(User u) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("user")).thenReturn(u);
        return req;
    }

    private Product productOf(User seller, long id, String name, boolean active) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setSeller(seller);
        p.setActive(active);
        return p;
    }

    private OrderItem item(Product product, int qty, double price) {
        OrderItem i = new OrderItem();
        i.setProduct(product);
        i.setQty(qty);
        i.setPrice(price);
        return i;
    }

    private Order order(String status, String paymentStatus, OrderItem... items) {
        Order o = new Order();
        o.setItems(List.of(items));
        o.setOrderStatus(status);
        o.setPaymentStatus(paymentStatus);
        return o;
    }

    @Test
    void revenueUsesItemPriceTimesQtyAndExcludesOtherSellersAndCancelledAndUnpaid() {

        Product tomatoes = productOf(sellerA, 11L, "Tomatoes", true);
        Product riceA = productOf(sellerA, 12L, "Brown Rice", true);
        Product riceB = productOf(sellerB, 22L, "Rice", true);

        Order paidProcessing = order("Processing", "Paid",
                item(tomatoes, 2, 50.0),
                item(riceB, 3, 100.0));

        Order paidShipped = order("Shipped", "Paid",
                item(riceA, 1, 500.0),
                item(tomatoes, 1, 10.0));

        Order unpaidDelivered = order("Delivered", "Pending",
                item(riceA, 1, 30.0));

        Order cancelledPaid = order("Cancelled", "Paid",
                item(tomatoes, 5, 10.0));

        when(orderRepo.findAll()).thenReturn(List.of(
                paidProcessing, paidShipped, unpaidDelivered, cancelledPaid));

        Product inactive = productOf(sellerA, 13L, "Old Item", false);
        when(productRepo.findBySeller(sellerA))
                .thenReturn(List.of(tomatoes, riceA, inactive));

        SellerAnalyticsDTO a = controller.analytics(requestFor(sellerA));

        // Only A's paid lines: 2x50 + 1x500 + 1x10 = 610.
        // B's 3x100, the unpaid 1x30 and the cancelled 5x10 are excluded.
        assertEquals(610.0, a.getTotalRevenue());
        assertEquals(3L, a.getTotalOrders());
        assertEquals(2L, a.getPendingOrders());
        assertEquals(1L, a.getCompletedOrders());
        // Tomatoes + Brown Rice are active; "Old Item" (inactive) is excluded
        assertEquals(2L, a.getActiveProducts());

        assertEquals(2, a.getTopProducts().size());
        assertEquals("Brown Rice", a.getTopProducts().get(0).getName());
        assertEquals(500.0, a.getTopProducts().get(0).getRevenue());
        assertEquals(1L, a.getTopProducts().get(0).getQtySold());
        assertEquals("Tomatoes", a.getTopProducts().get(1).getName());
        assertEquals(110.0, a.getTopProducts().get(1).getRevenue());
        assertEquals(3L, a.getTopProducts().get(1).getQtySold());
    }

    @Test
    void sellerBAnalyticsExcludeSellerAItems() {

        Product tomatoes = productOf(sellerA, 11L, "Tomatoes", true);
        Product riceB = productOf(sellerB, 22L, "Rice", true);

        Order paidMixed = order("Processing", "Paid",
                item(tomatoes, 2, 50.0),
                item(riceB, 3, 100.0));

        when(orderRepo.findAll()).thenReturn(List.of(paidMixed));
        when(productRepo.findBySeller(sellerB)).thenReturn(List.of(riceB));

        SellerAnalyticsDTO b = controller.analytics(requestFor(sellerB));

        assertEquals(300.0, b.getTotalRevenue());
        assertEquals(1L, b.getTotalOrders());
        assertEquals(1L, b.getActiveProducts());
        assertEquals(1, b.getTopProducts().size());
        assertEquals(22L, b.getTopProducts().get(0).getProductId());
    }

    // D. After the demo automation flips a COD order to Delivered + Paid,
    // the seller's own line items count toward revenue with no change to
    // the analytics implementation itself.
    @Test
    void deliveredAndPaidCodOrderCountsTowardSellerRevenue() {

        Product riceA = productOf(sellerA, 12L, "Brown Rice", true);

        Order demoDeliveredCod = order("Delivered", "Paid",
                item(riceA, 1, 120.0));

        when(orderRepo.findAll()).thenReturn(List.of(demoDeliveredCod));
        when(productRepo.findBySeller(sellerA)).thenReturn(List.of(riceA));

        SellerAnalyticsDTO a = controller.analytics(requestFor(sellerA));

        assertEquals(120.0, a.getTotalRevenue());
        assertEquals(1L, a.getTotalOrders());
        assertEquals(0L, a.getPendingOrders());
        assertEquals(1L, a.getCompletedOrders());
        assertEquals(1, a.getTopProducts().size());
        assertEquals("Brown Rice", a.getTopProducts().get(0).getName());
        assertEquals(120.0, a.getTopProducts().get(0).getRevenue());
    }

    // The mirror case: Delivered but still Pending contributes nothing,
    // keeping the PAID-order revenue definition intact.
    @Test
    void deliveredButUnpaidCodOrderIsStillExcludedFromRevenue() {

        Product riceA = productOf(sellerA, 12L, "Brown Rice", true);

        Order deliveredPendingCod = order("Delivered", "Pending",
                item(riceA, 1, 120.0));

        when(orderRepo.findAll()).thenReturn(List.of(deliveredPendingCod));
        when(productRepo.findBySeller(sellerA)).thenReturn(List.of(riceA));

        SellerAnalyticsDTO a = controller.analytics(requestFor(sellerA));

        assertEquals(0.0, a.getTotalRevenue());
        assertEquals(1L, a.getTotalOrders());
    }
}
