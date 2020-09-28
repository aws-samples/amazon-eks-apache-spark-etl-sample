import org.scalatest.{FunSuite,BeforeAndAfterAll}


class ValueZonesSpec extends FunSuite with BeforeAndAfterAll with SparkTestSession {


  test("raw rides results test") {

    ValueZones.runJob(spark,
      List("src/test/resources/yellow_tripdata_sample.csv"),
      List("src/test/resources/green_tripdata_sample.csv"),
      List("src/test/resources/taxi_zone_lookup.csv"),
      "src/test/resources/results/"
    )

    val results = spark.read.parquet("src/test/resources/results/raw-rides")
    val referenceResults = spark.read.parquet("src/test/resources/raw-rides/")
    assert(results.except(referenceResults).count == 0 )
  }

  test("value rides results test") {

    val results = spark.read.parquet("src/test/resources/results/value-rides")
    val referenceResults = spark.read.parquet("src/test/resources/value-rides/")
    assert(results.except(referenceResults).count == 0 )
  }
}
