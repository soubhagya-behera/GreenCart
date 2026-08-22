package com.example.greencart;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// The demo auto-delivery scheduler is disabled for this context test so the
// background job can never mutate rows of the real datasource mid-test.
@SpringBootTest(properties = "greencart.demo-auto-delivery.enabled=false")
class DemoApplicationTests {

	@Test
	void contextLoads() {
	}

}
