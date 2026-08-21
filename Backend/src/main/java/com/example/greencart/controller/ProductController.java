package com.example.greencart.controller;

import com.example.greencart.entity.Product;
import com.example.greencart.repository.CartItemRepository;
import com.example.greencart.repository.OrderItemRepository;
import com.example.greencart.repository.ProductRepository;
import com.example.greencart.repository.ReviewRepository;
import com.example.greencart.repository.WishlistRepository;
import com.example.greencart.service.FileUploadService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.greencart.util.RoleChecker;
import com.example.greencart.util.AccessGuard;
import com.example.greencart.exception.ForbiddenException;
import com.example.greencart.exception.UnauthorizedException;
import com.example.greencart.event.InventoryUpdateEvent;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;
import java.util.List;


import com.example.greencart.entity.User;

@RestController
@RequiredArgsConstructor
@RequestMapping("/products")
public class ProductController {

    private final ProductRepository repo;
    private final FileUploadService fileUploadService;
    private final CartItemRepository cartItemRepo;
    private final WishlistRepository wishlistRepo;
    private final OrderItemRepository orderItemRepo;
    private final ReviewRepository reviewRepo;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public List<Product> all() {
        return repo.findByActiveTrue();
    }

    @GetMapping("/categories")
public List<String> categories() {
    return repo.findDistinctCategories();
}

    @PostMapping(
        consumes = "multipart/form-data"
)
public Product create(

        HttpServletRequest request,

        @RequestParam String name,

        @RequestParam Double price,

        @RequestParam Integer stock,

        @RequestParam String category,

        @RequestParam(required = false)
        String description,

        @RequestParam(required = false)
        MultipartFile file

) throws Exception {

    User user =
            (User) request.getAttribute("user");

    RoleChecker.checkRole(
            user,
            "seller",
            "admin"
    );

    Product p = new Product();

    p.setName(name);

    p.setPrice(price);

    p.setStock(stock);

    p.setCategory(category);

    p.setDescription(description);

    p.setSeller(user);

    // IMAGE
    if (file != null && !file.isEmpty()) {

        String url =
                fileUploadService.uploadFile(file);

        p.setImageUrl(url);
    }

    return repo.save(p);
}
    @PostMapping("/upload")
public ResponseEntity<?> uploadImage(
        HttpServletRequest request,
        @RequestParam("file") MultipartFile file
) {

    User user = (User) request.getAttribute("user");

    if (user == null) {
        throw new UnauthorizedException();
    }

    AccessGuard.require(
            AccessGuard.hasAnyRole(user, "seller", "admin"),
            "Only sellers or admins can upload product images"
    );

    try {

        String url = fileUploadService
                .uploadFile(file);

        return ResponseEntity.ok(
                Map.of("url", url)
        );

    } catch (Exception e) {

    e.printStackTrace();

    throw new RuntimeException(
            e.getMessage()
    );
}
}

@GetMapping("/{id}")
public ResponseEntity<Product> getById(@PathVariable Long id) {
    return repo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
}

@GetMapping("/mine")
public List<Product> mine(HttpServletRequest request) {
    User user = (User) request.getAttribute("user");
    if (user == null) throw new UnauthorizedException();
    AccessGuard.require(
            AccessGuard.hasAnyRole(user, "seller", "admin"),
            "Access denied"
    );
    return repo.findBySeller(user);
}

@PutMapping("/{id}/stock")
public Product updateStock(
        @PathVariable Long id,
        @RequestBody Map<String, Integer> body,
        HttpServletRequest request
) {
    User user = (User) request.getAttribute("user");
    if (user == null) throw new UnauthorizedException();
    AccessGuard.require(
            AccessGuard.hasAnyRole(user, "seller", "admin"),
            "Access denied"
    );
    Product product = repo.findById(id).orElseThrow();
    AccessGuard.require(
            AccessGuard.canManageProduct(user, product),
            "You can only update your own products"
    );
    product.setStock(body.get("stock"));
    Product saved = repo.save(product);
    messagingTemplate.convertAndSend(
            "/topic/inventory",
            new InventoryUpdateEvent(
                    saved.getId(),
                    "INVENTORY_UPDATED",
                    saved.getStock()
            )
    );
    return saved;
}

@DeleteMapping("/{id}")
@Transactional
public String deleteProduct(
        @PathVariable Long id,
        HttpServletRequest request
) {
    User user = (User) request.getAttribute("user");
    if (user == null) throw new UnauthorizedException();
    AccessGuard.require(
            AccessGuard.hasAnyRole(user, "seller", "admin"),
            "Access denied"
    );

    Product product = repo.findById(id)
            .orElseThrow(() ->
                    new RuntimeException(
                            "Product not found"
                    )
            );

    AccessGuard.require(
            AccessGuard.canManageProduct(user, product),
            "You can only delete your own products"
    );

    cartItemRepo.deleteByProduct(product);
    wishlistRepo.deleteByProduct(product);

    if (
            orderItemRepo.existsByProduct(product)
            || reviewRepo.existsByProduct(product)
    ) {
        product.setActive(false);
        repo.save(product);
        return "Product removed from store. Order and review history preserved.";
    }

    repo.delete(product);
    return "Product deleted";
}


}