import org.scalatest.{BeforeAndAfterAll, FunSuite}


class ValueZonesSpec extends FunSuite with BeforeAndAfterAll with SparkTestSession {

  test("sourcePathBuilding parsing test") {
    val sourcePath = ValueZones.buildSourcePath("s3://nyc-tlc/trip data","yellow","2017,2018")
    val expected = List("s3://nyc-tlc/trip data/yellow_tripdata_2017-*.csv","s3://nyc-tlc/trip data/yellow_tripdata_2018-*.csv")
    assert(sourcePath == expected)
  }

  test("raw rides results test") {
    ValueZones.runJob(
      List("src/test/resources/yellow_tripdata_sample.csv"),
      List("src/test/resources/green_tripdata_sample.csv"),
      "src/test/resources/taxi_zone_lookup.csv",
      System.getProperty("user.dir")+"/src/test/resources/results/",
      "testing_db"
    )
    val results = spark.read.parquet("src/test/resources/results/raw-rides")
    val referenceResults = spark.read.parquet("src/test/resources/raw-rides/")
    assert(results.except(referenceResults).count == 0)
  }

  test("value rides results test") {
    val results = spark.read.parquet("src/test/resources/results/value-rides")
    val referenceResults = spark.read.parquet("src/test/resources/value-rides/")
    assert(results.except(referenceResults).count == 0)
  }

  test("hive tables raw_ride test") {
    val rawRides = spark.table("raw_rides")
    val referenceResults = spark.read.parquet("src/test/resources/raw-rides/")
    assert(rawRides.except(referenceResults).count() == 0)
  }

  test("hive tables value_ride test") {
    val rawRides = spark.table("value_rides")
    val referenceResults = spark.read.parquet("src/test/resources/value-rides/")
    assert(rawRides.except(referenceResults).count() == 0)
  }
}
