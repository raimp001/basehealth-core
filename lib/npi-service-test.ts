/**
 * Test script for NPI registry search functionality
 * Run this script to verify that the NPI registry search is working correctly
 */

import { searchNPIProviders, mapNPITaxonomyToSpecialty } from "./npi-service"

async function testNPISearch() {
  console.log("🔍 Starting NPI Registry Search Test")
  console.log("======================================")

  // Test case 1: Basic search by ZIP code
  try {
    console.log("Test 1: Basic search by ZIP code (10001)")
    const result = await searchNPIProviders({ zip: "10001", limit: 5 })
    console.log(`✅ Success! Found ${result.result_count} providers`)

    if (result.results.length > 0) {
      const firstProvider = result.results[0]
      console.log("Sample provider:")
      console.log(`  Name: ${firstProvider.basic.first_name} ${firstProvider.basic.last_name}`)
      console.log(`  NPI: ${firstProvider.number}`)

      if (firstProvider.taxonomies.length > 0) {
        const taxonomy = firstProvider.taxonomies[0]
        console.log(`  Taxonomy: ${taxonomy.desc}`)
        console.log(`  Mapped specialty: ${mapNPITaxonomyToSpecialty(taxonomy.desc)}`)
      }

      if (firstProvider.addresses.length > 0) {
        const address = firstProvider.addresses[0]
        console.log(`  Address: ${address.address_1}, ${address.city}, ${address.state} ${address.postal_code}`)
      }
    }
  } catch (error) {
    console.error("❌ Test 1 failed:", error)
  }

  // Test case 2: Search by specialty
  try {
    console.log("\nTest 2: Search by specialty (Cardiology in 90210)")
    const result = await searchNPIProviders({
      zip: "90210",
      taxonomy_description: "Cardiology",
      limit: 5,
    })
    console.log(`✅ Success! Found ${result.result_count} cardiologists`)

    if (result.results.length > 0) {
      console.log("First 3 specialties found:")
      result.results.slice(0, 3).forEach((provider, index) => {
        if (provider.taxonomies.length > 0) {
          console.log(`  ${index + 1}. ${provider.taxonomies[0].desc}`)
        }
      })
    }
  } catch (error) {
    console.error("❌ Test 2 failed:", error)
  }

  // Test case 3: Search by name
  try {
    console.log("\nTest 3: Search by last name (Smith)")
    const result = await searchNPIProviders({
      last_name: "Smith",
      limit: 5,
    })
    console.log(`✅ Success! Found ${result.result_count} providers with last name Smith`)
  } catch (error) {
    console.error("❌ Test 3 failed:", error)
  }

  // Test case 4: Search with multiple parameters
  try {
    console.log("\nTest 4: Search with multiple parameters (Dr. Johnson in New York)")
    const result = await searchNPIProviders({
      last_name: "Johnson",
      state: "NY",
      limit: 5,
    })
    console.log(`✅ Success! Found ${result.result_count} providers named Johnson in NY`)
  } catch (error) {
    console.error("❌ Test 4 failed:", error)
  }

  // Test case 5: Test error handling with invalid parameters
  try {
    console.log("\nTest 5: Test error handling with invalid parameters")
    // @ts-ignore - intentionally passing invalid parameter for testing
    const result = await searchNPIProviders({ invalid_param: "test" })
    console.log("Result:", result)
  } catch (error) {
    console.log("✅ Error handling works as expected:", (error as Error).message)
  }

  console.log("\n======================================")
  console.log("🏁 NPI Registry Search Test Complete")
}

// Execute the test
testNPISearch().catch((error) => {
  console.error("Test execution failed:", error)
})
