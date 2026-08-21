package com.example.greencart.config;

import com.example.greencart.security.JwtFilter;

import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpMethod;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;

import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.web.SecurityFilterChain;

import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtFilter jwtFilter;

        @Bean
        public SecurityFilterChain securityFilterChain(
                        HttpSecurity http) throws Exception {

                http
                                .csrf(csrf -> csrf.disable())

                                .sessionManagement(session -> session.sessionCreationPolicy(
                                                SessionCreationPolicy.STATELESS))

                                .authorizeHttpRequests(auth -> auth

                                                .requestMatchers(
                                                                "/ws/**",
                                                                "/auth/**",
                                                                "/uploads/**",
                                                                "/payment/**",
                                                                "/reviews/**")
                                                .permitAll()

                                                // Public product browsing only.
                                                // Mutations (POST/PUT/DELETE), image upload
                                                // and seller-only reads (/products/mine)
                                                // require authentication below.
                                                .requestMatchers(HttpMethod.GET,
                                                                "/products",
                                                                "/products/categories",
                                                                "/products/{id:[0-9]+}")
                                                .permitAll()

                                                // Public recipe viewing only.
                                                // Recipe management (POST/PUT/DELETE)
                                                // requires authentication below.
                                                .requestMatchers(HttpMethod.GET,
                                                                "/recipes",
                                                                "/recipes/{id:[0-9]+}")
                                                .permitAll()

                                                .anyRequest().authenticated())

                                .addFilterBefore(
                                                jwtFilter,
                                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }
}